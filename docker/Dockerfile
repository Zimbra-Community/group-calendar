# docker container rm -f $(docker container ls -aq)
# docker rmi $(docker images -a -q)
# docker system prune -a -f
 
# docker image build -t groupcal .

# docker run --init --name groupcal --restart=always -v /opt/groupcal:/opt/groupcal -d groupcal

#  --init changes the pid of supervisord, allowing to pass arguments

# docker container logs --follow groupcal
# docker exec -it groupcal bash

# docker container stop groupcal
# docker container ls -a
# docker container start groupcal

FROM centos:centos7

RUN rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY*
RUN yum -y update \
   &&  yum -y install epel-release \
   && yum -y install yum-priorities

RUN yum -y install net-tools nano wget curl 

RUN yum install -y https://centos7.iuscommunity.org/ius-release.rpm

RUN sed -i 's|^enabled=1|enabled=1\npriority=10|' /etc/yum.repos.d/epel.repo

RUN yum -y update
RUN yum -y groupinstall 'Development Tools'
RUN yum -y install supervisor
RUN yum -y install python36u python36u-libs python36u-devel python36u-pip

RUN yum install -y mariadb-server gcc mariadb-devel

RUN echo -e "[program:mysqld]\ncommand=/usr/bin/mysqld_safe --basedir='/usr' --datadir='/var/lib/mysql'\nredirect_stderr=true" > /etc/supervisord.d/mysqld.ini

#FIXME: run this only once
RUN echo -e "[program:init]\ncommand=/setup.sh\nredirect_stderr=true" > /etc/supervisord.d/init.ini

ADD setup.sh /setup.sh
ADD initsql.sql /initsql.sql
RUN chmod +rx /setup.sh

#FIXME: passwordless root log-in
RUN /usr/bin/mysql_install_db
RUN chown mysql:mysql /var/lib/mysql -R

RUN mkdir /opt/groupcal


WORKDIR /opt/groupcal
RUN /usr/bin/pip3.6 install --upgrade pip
RUN /usr/bin/pip3.6 install python-zimbra mysql-connector-python 


# Install the Group Calendar Python

RUN mkdir /etc/groupcal
# disable SSL certificate checks, using IP instead of hostname, this is the same as in Python 2 version.
ADD https://raw.githubusercontent.com/Zimbra-Community/group-calendar/master/patches/communication.py /usr/lib/python3.6/site-packages/pythonzimbra/communication.py
ADD https://raw.githubusercontent.com/Zimbra-Community/group-calendar/master/agent/groupcal.py /etc/groupcal/groupcal.py

#Debug anyone?
#ENTRYPOINT ["sleep", "500"]
ENTRYPOINT ["/usr/bin/supervisord", "-n","-c","/etc/supervisord.conf"]
