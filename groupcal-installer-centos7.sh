#!/bin/bash

# Copyright (C) 2016-2018  Barry de Graaff
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 2 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see http://www.gnu.org/licenses/.

# Keep `set -e` as the first line of the script, so the execution halts on unexpected errors.
set -e
# if you want to trace your script uncomment the following line
#set -x

# Make sure only root can run our script
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

echo ""
echo "Groupcal Installer for CentOS 7"
echo ""
echo "This installer will set-up Groupcal for Zimbra on CentOS 7, this installer is provided without warranty as described in:"
echo "https://github.com/Zimbra-Community/zimbra.de_dieploegers_groupcal/blob/master/LICENSE"
echo "Any key to continue or CTRL+C to abort."
read dummy;

DEFAULT_DOMAIN=$(su zimbra -c "/opt/zimbra/bin/zmprov gad | head -n 1")

echo "Please enter the Zimbra email domain to create the Groupcal."
echo "The domain must already be configured on your Zimbra. Default: $DEFAULT_DOMAIN"
read DOMAIN;

if [ -z "$DOMAIN" ]
then
DOMAIN=$DEFAULT_DOMAIN
fi

echo "Installing Python"
yum install -y python curl wget unzip

if [[ -x "/usr/bin/python2" ]]
then
    echo "Python 2 is found"
else
    echo "Python 2 is not found"
    exit 0
fi

TMPFOLDER="$(mktemp -d /tmp/groupcal-installer.XXXXXXXX)"
cd $TMPFOLDER

echo "Installing pip and python-zimbra"
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python get-pip.py
pip install python-zimbra

echo "Fetching the latest Groupcal release"

wget https://github.com/Zimbra-Community/zimbra.de_dieploegers_groupcal/releases/download/v1.0-rc8/bundle-v1.0-rc8.zip -O bundle.zip
unzip bundle.zip
chown zimbra:zimbra $TMPFOLDER -R

echo "Installing server extension"
rm -Rf /opt/zimbra/lib/ext/de_dieploegers_groupcal
mkdir -p /opt/zimbra/lib/ext/de_dieploegers_groupcal
cp -v *.jar /opt/zimbra/lib/ext/de_dieploegers_groupcal/

echo "Installing Zimlet"
su - zimbra -c "zmzimletctl -l deploy $TMPFOLDER/de_dieploegers_groupcal.zip"

echo "Installing Python Script"
cp -v *.py /usr/local/sbin/

echo "Installing Bash Script runner for use with cron"
wget https://raw.githubusercontent.com/Zimbra-Community/zimbra.de_dieploegers_groupcal/master/bin/groupcal-run.sh -O /usr/local/sbin/groupcal-run.sh
chmod +rx /usr/local/sbin/groupcal-run.sh

echo "Creating admin user for sync"
GROUPCAL_PWD=$(< /dev/urandom tr -dc A-Za-z0-9 | head -c${1:-10};echo;)
GROUPCAL_USER=groupcaladmin@$DOMAIN
set +e
su - zimbra -c "/opt/zimbra/bin/zmprov ca $GROUPCAL_USER $GROUPCAL_PWD zimbraIsAdminAccount TRUE"
set -e
su - zimbra -c "/opt/zimbra/bin/zmprov sp $GROUPCAL_USER $GROUPCAL_PWD"
sed -i 's/USERNAME/'"$GROUPCAL_USER"'/g' /usr/local/sbin/groupcal-run.sh
sed -i 's/PASSWORD/'"$GROUPCAL_PWD"'/g' /usr/local/sbin/groupcal-run.sh

echo "Setting up distribution lists"
set +e
su zimbra -c "/opt/zimbra/bin/zmprov cdl gcal_@$DOMAIN"
su zimbra -c "/opt/zimbra/bin/zmprov cdl sec_gcal_@$DOMAIN"
set -e
su zimbra -c "/opt/zimbra/bin/zmprov adlm gcal_@$DOMAIN $GROUPCAL_USER"
su zimbra -c "/opt/zimbra/bin/zmprov adlm sec_gcal_@$DOMAIN $GROUPCAL_USER"

ls -hal $TMPFOLDER
rm -Rf $TMPFOLDER

echo "--------------------------------------------------------------------------------------------------------------
Groupcal installed successful.

You can use the following distribution lists:
gcal_@$DOMAIN
sec_gcal_@$DOMAIN

Check the readme: https://github.com/Zimbra-Community/zimbra.de_dieploegers_groupcal

To load the extension:
su zimbra
zmmailboxdctl restart

You also need to have a pre-auth enabled domain, if you don't use pre authentication yet, run
zmprov generateDomainPreAuthKey $DOMAIN
More info on pre-auth: https://wiki.zimbra.com/wiki/Preauth

In addition the python script expects to connect to port 443 on your domain.

then run crontab -e and append something like this for the Zimbra user:
10,20,30,40,50,0 * * * * /usr/local/sbin/groupcal-run.sh
"
