"""

Agent running periodically, that manages an appointment cache as a database
for the group calendar zimlet.

@author: Dennis Ploeger <develop@dieploegers.de>

"""
import calendar
import json
import logging
from optparse import OptionParser
import mysql.connector as mariadb
import datetime
from pythonzimbra.communication import Communication
from pythonzimbra.tools import auth
from pythonzimbra.tools.dict import get_value
import time

SEARCH_LIMIT = 100

""" How many results to fetch in one SearchRequest """

WAIT_AFTER_SEARCH = 0.5

""" How many seconds (may be a fracture) to wait between to search requests (
for DoS-Filter mitigation) """

if __name__ == '__main__':

    # Parse options

    parser = OptionParser(
        usage="Usage: %prog [options] SERVER USERNAME PASSWORD",
        description="SERVER: Name/IP of Zimbra-Server, "
                    + "USERNAME: Administrative account username, "
                    + "PASSWORD: Password of administrative account"
                    + "You have to additionally specify options -h and -r."
    )

    parser.add_option(
        "-q",
        "--quiet",
        action="store_true",
        dest="quiet",
        help="Be quiet doing things."
    )

    parser.add_option(
        "-d",
        "--debug",
        action="store_true",
        dest="debug",
        help="Enable debug logging"
    )

    parser.add_option(
        "-s",
        "--start",
        action="store",
        dest="start",
        help="Sync x days back (defaults to 14)",
        default=14,
        type="int"
    )

    parser.add_option(
        "-e",
        "--end",
        action="store",
        dest="end",
        help="Sync until x days (defaults to 62)",
        default=62,
        type="int"
    )

    parser.add_option(
        "-p",
        "--prefix",
        action="store",
        dest="prefix",
        help="Prefix for group calendar distribution list (defaults to gcal_)",
        default="gcal_"
    )

    parser.add_option(
        "--dbuser",
        action="store",
        dest="dbuser",
        help="MariaDB database user",
        default="ad-groupcal_db"
    )

    parser.add_option(
        "--dbpassword",
        action="store",
        dest="dbpassword",
        help="MariaDB database password"
    )

    parser.add_option(
        "--dbname",
        action="store",
        dest="dbname",
        help="Name of caching database",
        default="groupcal_db"
    )
    
    parser.add_option(
        "--dbport",
        action="store",
        dest="dbport",
        help="MariaDB port",
        default="3306"
    )
    
    parser.add_option(
        "--dbhost",
        action="store",
        dest="dbhost",
        help="MariaDB server host",
        default="127.0.0.1"
    )        

    (options, args) = parser.parse_args()

    # Sanity Check

    if options.dbpassword is None:
        parser.error("Please specify the database password")

    if len(args) < 3:
        parser.error("Invalid number of arguments")

    (server_name, admin_account, admin_password) = args

    if options.quiet and options.debug:
        parser.error("Cannot specify debug and quiet at the same time.")

    if options.quiet:
        logging.basicConfig(level=logging.FATAL)
    elif options.debug:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    # Basic work done, let's go.

    logging.debug("Starting groupcal agent")

    # Calculate point in times for appointment expansion

    expand_start = datetime.datetime.now() - datetime.timedelta(options.start)
    expand_end = datetime.datetime.now() + datetime.timedelta(options.end)

    # Calculate the epoch-timestamps for Zimbra (in milliseconds)

    expand_start_epoch = calendar.timegm(expand_start.utctimetuple()) * 1000
    expand_end_epoch = calendar.timegm(expand_end.utctimetuple()) * 1000

    # Build up Zimbra communication

    url = "https://%s:7071/service/admin/soap" % server_name
    user_url = "https://%s/service/soap" % server_name

    comm = Communication(url)

    user_comm = Communication(user_url)

    token = auth.authenticate(
        url,
        admin_account,
        admin_password,
        admin_auth=True
    )

    if token is None:

        logging.error(
            "Cannot login into zimbra with the supplied credentials."
        )

        exit(1)

    # Search for groupcal dictionaries

    search_request = comm.gen_request(token=token)

    search_request.add_request(
        "SearchDirectoryRequest",
        {
            "query": "uid=%s*" % options.prefix,
            "types": "distributionlists"
        },
        "urn:zimbraAdmin"
    )

    search_response = comm.send_request(search_request)

    if search_response.is_fault():

        raise Exception(
            "Cannot fetch distribution lists: (%s) %s" % (
                search_response.get_fault_code(),
                search_response.get_fault_message()
            )
        )

    lists = search_response.get_response()["SearchDirectoryResponse"]["dl"]

    if not isinstance(lists, list):

        lists = [lists]

    fetch_members = []

    # Walk through the lists to fetch all members

    for current_list in lists:

        logging.debug("Found list %s" % current_list["name"])

        distlist_request = comm.gen_request(token=token)
        distlist_request.add_request(
            "GetDistributionListRequest",
            {
                "dl": {
                    "by": "name",
                    "_content": current_list["name"]
                }
            },
            "urn:zimbraAdmin"
        )

        distlist_response = comm.send_request(distlist_request)

        if distlist_response.is_fault():

            logging.error("Cannot fetch distribution list %s: (%s) %s" % (
                current_list["name"],
                distlist_response.get_fault_code(),
                distlist_response.get_fault_message()
            ))

            exit(1)

        for member in distlist_response.get_response()[
                "GetDistributionListResponse"]["dl"]["dlm"]:

            if not member["_content"] in fetch_members:

                fetch_members.append(member["_content"])

    if len(fetch_members) == 0:

        # Nothing to do.

        logging.info("No members found.")

        exit(0)

    # Is the database ready?
    db = mariadb.connect(user=options.dbuser, password=options.dbpassword, database=options.dbname, port=options.dbport, host=options.dbhost)
    c = db.cursor()

    # We don't sync here, so simply drop the
    # table. It is recreated afterwards

    c.execute("TRUNCATE TABLE APPTCACHE")

    preauth_cache = {}

    # Fetch new appointments

    for member in fetch_members:

        # Check, if the account is active

        logging.debug("Working on account %s" % member)

        getaccount_request = comm.gen_request(token=token)

        getaccount_request.add_request(
            "GetAccountRequest",
            {
                "account": {
                    "_content": member,
                    "by": "name"
                }
            },
            "urn:zimbraAdmin"
        )

        getaccount_response = comm.send_request(getaccount_request)

        if getaccount_response.is_fault():

            logging.error("Cannot fetch account %s: (%s) %s" % (
                member,
                getaccount_response.get_fault_code(),
                getaccount_response.get_fault_message()
            ))

            exit(1)

        if get_value(
            getaccount_response.get_response()["GetAccountResponse"][
                "account"]["a"],
            "zimbraAccountStatus"
        ) != "active":

            # No. Skip it.

            logging.info("Account %s is inactive. Skipping." % member)

            continue

        # Get Preauth key to authenticate for this user

        (local_part, domain_part) = member.split("@")

        if domain_part not in preauth_cache:

            # Preauthkey for domain hasn't been fetched. Do it.

            logging.debug("Fetching preauth key for domain %s" % domain_part)

            get_pak_request = comm.gen_request(token=token)

            get_pak_request.add_request(
                "GetDomainRequest",
                {
                    "domain": {
                        "by": "name",
                        "_content": domain_part
                    }
                },
                "urn:zimbraAdmin"
            )

            get_pak_response = comm.send_request(get_pak_request)

            if get_pak_response.is_fault():

                raise Exception(
                    "Error loading domain preauth "
                    "key for domain %s: (%s) %s" % (
                        domain_part,
                        get_pak_response.get_fault_code(),
                        get_pak_response.get_fault_message()
                    )
                )

            pak = get_value(
                get_pak_response.get_response()["GetDomainResponse"][
                    "domain"]["a"],
                "zimbraPreAuthKey"
            )

            if pak is None:

                logging.info(
                    "Cannot find preauth key for domain %s. "
                    "Please use zmprov gdpak %s first. Skipping account." % (
                        domain_part
                    )
                )

                continue

            preauth_cache[domain_part] = str(pak)

        # Login to the account

        user_token = auth.authenticate(
            user_url,
            member,
            preauth_cache[domain_part]
        )

        if user_token is None:

            logging.error(
                "Cannot login into account %s using preauth." % member
            )

            exit(1)

        # Paged Search for the appointments within the range

        appt_request = user_comm.gen_request(token=user_token)

        search_params = {
            "query": "in:/Calendar",
            "types": "appointment",
            "calExpandInstStart": expand_start_epoch,
            "calExpandInstEnd": expand_end_epoch,
            "limit": SEARCH_LIMIT
        }

        appt_request.add_request(
            "SearchRequest",
            search_params,
            "urn:zimbraMail"
        )

        appt_response = user_comm.send_request(appt_request)

        current_offset = 0

        while True:

            if appt_response.is_fault():

                logging.error("Cannot fetch appointment data: (%s) %s" % (
                    appt_response.get_fault_code(),
                    appt_response.get_fault_message()
                ))

                exit(1)

            if "appt" not in appt_response.get_response()["SearchResponse"]:

                # No appointments found. Skip

                logging.debug("No appointments found. Skipping")

                break

            appts = appt_response.get_response()["SearchResponse"]["appt"]

            if not isinstance(appts, list):

                # Only one appointment exist. Convert it into a list

                appts = [appts]

            for appt in appts:

                if appt["class"] != "PUB":

                    logging.debug("Private appointment found. Skipping.")

                    continue

                logging.debug("Loading appointment %s" % appt["name"])

                insts = appt["inst"]

                if not isinstance(insts, list):

                    # Only one instance exist. Convert it into a list

                    insts = [insts]

                inst_id = 0

                for inst in insts:

                    # Create a copy of the appointment and remove all other
                    # instances

                    temp_appt = appt

                    temp_appt["inst"] = inst

                    # Calculate start and end times of the
                    # appointment optionally capping them
                    # to the requested start and end times

                    start_timestamp = inst["s"]
                    end_timestamp = inst["s"] + temp_appt["dur"]

                    if start_timestamp < expand_start_epoch:
                        start_timestamp = expand_start_epoch

                    if end_timestamp > expand_end_epoch:
                        end_timestamp = expand_end_epoch

                    # Add the appointment

                    logging.debug("Adding appointment into database")
                    logging.debug("%s%d" % (temp_appt["id"], inst_id))
                    logging.debug(inst["ridZ"])
                    logging.debug(member)
                    logging.debug(start_timestamp / 1000)
                    logging.debug(end_timestamp / 1000)
                    logging.debug(json.dumps(temp_appt))
                    
                    c.execute(
                        "replace into APPTCACHE ("
                        "ID, RECURRENCEID, ACCOUNT, START_TIMESTAMP, "
                        "END_TIMESTAMP, APPTDATA"
                        ") VALUES (%s,%s,%s,%s,%s,%s)",
                        (
                            "%s%d" % (temp_appt["id"], inst_id),
                            inst["ridZ"],
                            member,
                            start_timestamp / 1000,
                            end_timestamp / 1000,
                            json.dumps(temp_appt)
                        )
                    )

                    inst_id += 1

            # Wait some time to mitigate the DoS-Filter

            time.sleep(WAIT_AFTER_SEARCH)

            if appt_response.get_response()["SearchResponse"]["more"]:

                # We have more pages. Rerun the search

                current_offset += SEARCH_LIMIT

                search_params["offset"] = current_offset
                appt_request.clean()

                appt_request.set_auth_token(user_token)
                appt_request.add_request(
                    "SearchRequest",
                    search_params,
                    "urn:zimbraMail"
                )

                appt_response = comm.send_request(appt_request)

            else:

                # We're done here. Escape the loop

                break

    # Commit work

    db.commit()

    logging.debug("Finished")
