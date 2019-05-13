#!/bin/bash

# Copyright (C) 2014-2019  Barry de Graaff
#
# Bugs and feedback: https://github.com/Zimbra-Community/zimbra.de_dieploegers_groupcal/issues
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

/usr/bin/python3.6 /etc/groupcal/groupcal.py -d --dbuser root --dbpassword '' zimbraserver USERNAME PASSWORD

