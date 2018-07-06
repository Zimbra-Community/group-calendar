# Aggregated calendars for Zimbra Collaboration Server

## Introduction

Team managers often need to get a quick overview over their team's 
appointments. Zimbra's sharing method allows them to embed the calendar of 
every team member into their own calendar view in the Zimbra web client.

However, in some cases, this has some disadvantages:

* When teams change, links get out of date, are unavailable or available to 
the wrong users
* In large teams, the calendar view tends to get cluttered with appointments
* Things like the sidebar zimlet get cluttered with unrelated appointments
* It is very cumbersome to create the appropriate shares for all team members

This extension allows a central managment of group calendars. The main 
calendars of several users can be grouped together using a distribution list.
 Permissions to access this group calendar are handled using a corresponding 
 distribution list.
 
The extension consists of four parts:

* A caching database holding the appointment data of all group calendars
* A python agent managing that database
* A zimlet displaying that data
* A soap extension giving the zimlet access to the data

## Requirements

* [Zimbra Collaboration Server] [zimbra] versions 8.5 and up
* [Python] [python] versions 2.7 and up (currently not Python 3-compatible!)
* [Zimbra python libraries] [python-zimbra] versions 1.1-rc4 and up

## Installation

For CentOS 7 only, you can run the automated installer

    wget https://raw.githubusercontent.com/Zimbra-Community/zimbra.de_dieploegers_groupcal/master/groupcal-installer-centos7.sh -O /tmp/groupcal-installer-centos7.sh
    chmod +rx /tmp/groupcal-installer-centos7.sh
    /tmp/groupcal-installer-centos7.sh
   

The release bundle contains:

* The Python agent (groupcal.py). Needs to be deployed to a local directory 
on a server with [Python] [python] and the [Zimbra python 
libraries] [python-zimbra]
* The Zimbra server extension. On your zimbra server, create a directory 
/opt/zimbra/lib/ext/de_dieploegers_groupcal and place the file 
de_dieplogers_groupcal.jar there. 
* The Sqlite-JDBC-class. Move the file "sqlite-jdbc-3.7.2.jar" to 
/opt/zimbra/mailboxd/lib/ext 
* The zimlet. This can be simply installed using the ZCS administration 
console or the zmzimletctl script

## Configuration

The Soap server extension needs special configuration strings. This is done 
using the Zimbra localconfig environment. Because of this, 
this configuration has to be done on every mailbox server in a multi-server 
environment.

As a default, the server is using a SQLite3-database at 
/opt/zimbra/data/caching.db.

If you want to customize that, the following keys can be set:

* groupcal_jdbc_driver: JDBC-Database driver Currently only org.sqlite.JDBC 
(sqlite3-driver) is supported
* groupcal_jdbc_url: JDBC-URL to the database. (i.e. 
jdbc:sqlite:/opt/zimbra/data/caching.db)
* groupcal_jdbc_username: JDBC user name, currently not needed
* groupcal_jdbc_password: JDBC password, currently not needed

## Agent startup

The agent is run periodically and manages the caching database (removes 
unneeded data, fetches new data).

It needs four parameters to work:

    python groupcal.py -D <path to the caching database> <Hostname of one 
    zimbra mailbox server> <administrative username> <password>

There are other parameters available, which are described in the command 
help, that is available using the parameter --help.

## Usage

The group calendars are defined using the membership in specific groups.

To create a group calendar out of appointments of a set of users, 
create a new distribution list called gcal_<name of group calendar>@<domain> 
and put the users into this distribution list.

To make this group calendar available to specific users, 
create another distribution list called sec_gcal_<name of group 
calendar>@<domain> and put that users there.

Usually, you put the team members into the gcal_-Group and the team manager 
into the sec_gcal_-Group. This way, the team manager has access all the 
calendars of the team members.

(The prefixes are configureable using the 
localconfig-parameters "groupcal_gcal_prefix" and "groupcal_sec_prefix")

## Private appointments

Private appointments are filtered out by the agent script, 
so you don't have to worry about private appointments reaching unauthorized 
eyes.

## WARNING

This extension works around Zimbra's permissionset. It uses an administrative
 user to fetch all the calendars and the soap extension to display them to an
  arbitrary user.
  
This may not be, what your data safety regulations allow. So, 
please check with this and always notify your team members, 
that you want to set up the group calendar!

[zimbra]: http://www.zimbra.com
[python]: http://www.python.org
[python-zimbra]: https://github.com/Zimbra-Community/python-zimbra
