#!/bin/bash

# Copyright (C) 2016-2019  Barry de Graaff
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
echo "Zimbra Group Calendar Installer"
echo ""
echo "This installer will set-up Group Calendar for Zimbra, this installer is provided without warranty as described in:"
echo "https://github.com/Zimbra-Community/group-calendar/blob/master/LICENSE"
echo "This installer will set-up a docker container and restarts mailbox."

echo "THIS IS A WORK IN PROGRESS - ABORT NOW, HIT CTRL+C"

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

echo "Check if yum/apt installed."
set +e
YUM_CMD=$(which yum)
APT_CMD=$(which apt-get)
set -e 

if [[ ! -z $YUM_CMD ]]; then
echo "Removing Docker distro packages"
yum remove -y docker \
                  docker-client \
                  docker-client-latest \
                  docker-common \
                  docker-latest \
                  docker-latest-logrotate \
                  docker-logrotate \
                  docker-engine   

echo "Installing Docker dependancies"
yum install -y yum-utils \
  device-mapper-persistent-data \
  lvm2 wget net-tools sed gawk curl

echo "Installing Docker"
yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo
    
yum install -y docker-ce docker-ce-cli containerd.io
else
echo "Removing Docker distro packages"
apt-get remove -y docker docker-engine docker.io containerd runc

echo "Installing Docker dependancies"
apt-get update
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg-agent \
    software-properties-common wget net-tools sed gawk curl

echo "Installing Docker"
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io
fi
   
echo "Enable Docker on boot, start Docker"   
systemctl enable docker
systemctl start docker

echo "Creating Docker network"
docker network inspect zimbradocker &>/dev/null || docker network create --subnet=172.18.0.0/16 zimbradocker

#Find free IP / is there an easier way?
for ((i = 2 ; i < 255 ; i++ )); do 
   FREEIP=$(docker network inspect zimbradocker | grep 172.18.0.$i/16 | wc -l)
   if [[ $FREEIP = "0" ]]; then
      DOCKERIP="172.18.0."$i
      export DOCKERIP
      break;
   fi
done

echo "Starting Docker container"
docker pull zetalliance/group-calendar:latest
rm -Rf /opt/groupcal

# Execute docker run command
docker run --init --net zimbradocker \
             --ip $DOCKERIP \
             --name groupcal --restart=always -v /opt/groupcal:/opt/groupcal -d zetalliance/group-calendar:latest


TMPFOLDER="$(mktemp -d /tmp/groupcal-installer.XXXXXXXX)"
cd $TMPFOLDER

echo "Fetching the latest Groupcal release"
chown zimbra:zimbra $TMPFOLDER -R

echo "Installing server extension"
rm -Rf /opt/zimbra/lib/ext/de_dieploegers_groupcal
mkdir -p /opt/zimbra/lib/ext/de_dieploegers_groupcal
wget --no-cache https://github.com/Zimbra-Community/group-calendar/raw/master/serverextension/out/artifacts/serverextension_jar/serverextension.jar -O /opt/zimbra/lib/ext/de_dieploegers_groupcal/Groupcal.jar

DB_PWD=$(< /dev/urandom tr -dc A-Za-z0-9 | head -c${1:-10};echo;)
echo "db_connect_string=jdbc:mariadb://$DOCKERIP:3306/groupcal_db?user=ad-groupcal_db&password=$DB_PWD" > /opt/zimbra/lib/ext/de_dieploegers_groupcal/db.properties

cat <<EOF > "/opt/groupcal/create-user.sql"
DROP USER 'ad-groupcal_db'@'%';
CREATE USER 'ad-groupcal_db'@'%' IDENTIFIED BY '${DB_PWD}'; 
GRANT ALL PRIVILEGES ON groupcal_db . * TO 'ad-groupcal_db'@'%' WITH GRANT OPTION; 
FLUSH PRIVILEGES ; 
EOF

echo "Installing Zimlet"
wget --no-cache https://github.com/Zimbra-Community/group-calendar/releases/download/0.0.1/de_dieploegers_groupcal.zip -O $TMPFOLDER/de_dieploegers_groupcal.zip
su - zimbra -c "zmzimletctl -l deploy $TMPFOLDER/de_dieploegers_groupcal.zip"

echo "Creating admin user for sync"
GROUPCAL_PWD=$(< /dev/urandom tr -dc A-Za-z0-9 | head -c${1:-10};echo;)
GROUPCAL_USER=groupcaladmin@$DOMAIN
set +e
su - zimbra -c "/opt/zimbra/bin/zmprov ca $GROUPCAL_USER $GROUPCAL_PWD cn 'Group Calendar Admin' displayName 'Group Calendar Admin' givenName 'Group Calendar Admin' zimbraIsAdminAccount TRUE"
set -e
su - zimbra -c "/opt/zimbra/bin/zmprov sp $GROUPCAL_USER $GROUPCAL_PWD"


echo "Installing Bash Script runner for use with cron"
source /opt/zimbra/bin/zmshutil
zmsetvars
wget https://raw.githubusercontent.com/Zimbra-Community/group-calendar/master/bin/groupcal-run.sh -O /opt/groupcal/groupcal-run.sh
chmod +rx /usr/local/sbin/groupcal-run.sh
sed -i 's/USERNAME/'"$GROUPCAL_USER"'/g' /opt/groupcal/groupcal-run.sh
sed -i 's/PASSWORD/'"$GROUPCAL_PWD"'/g' /opt/groupcal/groupcal-run.sh
sed -i 's/somepassword/'"$DB_PWD"'/g' /opt/groupcal/groupcal-run.sh
sed -i '/zimbraserver/'"$zimbra_server_hostname"'/g /opt/groupcal/groupcal-run.sh

echo "Setting up distribution lists"
set +e
su zimbra -c "/opt/zimbra/bin/zmprov cdl gcal_@$DOMAIN"
su zimbra -c "/opt/zimbra/bin/zmprov cdl sec_gcal_@$DOMAIN"
set -e
su zimbra -c "/opt/zimbra/bin/zmprov mdl gcal_@$DOMAIN displayName 'Group Calendar'"
su zimbra -c "/opt/zimbra/bin/zmprov mdl sec_gcal_@$DOMAIN displayName 'Security Group Calendar'"
su zimbra -c "/opt/zimbra/bin/zmprov adlm gcal_@$DOMAIN $GROUPCAL_USER"
su zimbra -c "/opt/zimbra/bin/zmprov adlm sec_gcal_@$DOMAIN $GROUPCAL_USER"

ls -hal $TMPFOLDER
rm -Rf $TMPFOLDER

su zimbra -c "/opt/zimbra/bin/zmmailboxdctl restart"

echo "--------------------------------------------------------------------------------------------------------------
Groupcal installed successful.

You can use the following distribution lists:
gcal_@$DOMAIN
sec_gcal_@$DOMAIN

Check the readme: https://github.com/Zimbra-Community/group-calendar


You also need to have a pre-auth enabled domain, if you don't use pre authentication yet, run
zmprov generateDomainPreAuthKey $DOMAIN
More info on pre-auth: https://wiki.zimbra.com/wiki/Preauth

In addition the python script expects to connect to port 443 on your domain.

then run crontab -e and append something like this for the Zimbra user:
10,20,30,40,50,0 * * * * /usr/local/sbin/groupcal-run.sh
"
