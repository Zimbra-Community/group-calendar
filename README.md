# Work in progress DO NOT INSTALL



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

This extension allows a central management of group calendars. The main 
calendars of several users can be grouped together using a distribution list.
 Permissions to access this group calendar are handled using a corresponding 
 distribution list.

![Group Calendar Screenshot](https://raw.githubusercontent.com/Zimbra-Community/zimbra.de_dieploegers_groupcal/master/groupcal.png "Group Calendar Screenshot")

## Installation

Automated installer for CentOS 7 and Ubuntu, run it on all your mailbox servers.

    wget https://raw.githubusercontent.com/Zimbra-Community/group-calendar/master/groupcal-installer.sh -O /tmp/groupcal-installer.sh
    chmod +rx /tmp/groupcal-installer.sh
    /tmp/groupcal-installer.sh

## Usage

The group calendars are defined using the membership in specific groups (distribution lists).

To create a group calendar out of appointments of a set of users, 
create a new distribution list called gcal_<name of group calendar>@<domain> 
and put the users into this distribution list.

To make this group calendar available to specific users, 
create another distribution list called sec_gcal_<name of group 
calendar>@<domain> and put that users there.

Usually, you put the team members into the gcal_-Group and the team manager 
into the sec_gcal_-Group. This way, the team manager has access all the 
calendars of the team members.


## Private appointments

Private appointments are ignored by Group Calendar, 
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
