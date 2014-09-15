"""

Agent running periodically, that manages an appointment cache as a database
for the group calendar zimlet.

@author: Dennis Ploeger <develop@dieploegers.de>

"""
import logging
from optparse import OptionParser
from pythonzimbra.communication import Communication
from pythonzimbra.request_json import RequestJson
from pythonzimbra.response_json import ResponseJson
from pythonzimbra.tools import auth

if __name__ == '__main__':

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
        default="14"
    )

    parser.add_option(
        "-e",
        "--end",
        action="store",
        dest="end",
        help="Sync until x days (defaults to 62)",
        default="62"
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
        "-D",
        "--database",
        action="store",
        dest="database",
        help="Name of caching database"
    )

    (options, args) = parser.parse_args()

    if options.database is None:
        parser.error("Please specify the database name")

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

    logging.debug("Starting groupcal agent")

    url = "https://%s:7071/service/admin/soap" % server_name

    comm = Communication(url)

    token = auth.authenticate(
        url,
        admin_account,
        admin_password,
        admin_auth=True
    )

    search_request = RequestJson()

    search_request.set_auth_token(token)

    search_request.add_request(
        "SearchDirectoryRequest",
        {
            "query": "uid=%s*" % options.prefix,
            "types": "distributionlists"
        },
        "urn:zimbraAdmin"
    )

    search_response = ResponseJson()

    comm.send_request(search_request, search_response)

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

    for current_list in lists:

        logging.debug("Found list %s" % current_list["name"])

        for member in current_list["dlm"]:

            if not member in fetch_members:

                fetch_members.append(member)

    print fetch_members