/*
 Document   : de_dieploegers_groupcal.js
 Author     : Dennis Ploeger <develop@dieploegers.de>
 Description: Auto complete handler for search
*/

function de_dieploegers_groupcalAutocomplete() {

    this.groups = {};

}

de_dieploegers_groupcalAutocomplete.prototype = {};
de_dieploegers_groupcalAutocomplete.prototype.constructor =
    de_dieploegers_groupcalAutocomplete;

/**
 * Returns a list of matching group members for a list.
 *
 * @param {String}					str				the string to match against
 * @param {closure}					callback		the callback to run with results
 * @param {ZmAutocompleteListView}	aclv			the needed to show wait msg
 * @param {ZmZimbraAccount}			account			the account to fetch cached items from
 * @param {Hash}					options			additional options:
 * @param {constant}				 type			 type of result to match; default is {@link ZmAutocomplete.AC_TYPE_CONTACT}; other valid values are for location or equipment
 * @param {Boolean}					needItem		 if <code>true</code>, return a {@link ZmItem} as part of match result
 * @param {Boolean}					supportForget	allow user to reset ranking for a contact (defaults to true)
 */

de_dieploegers_groupcalAutocomplete.prototype.autocompleteMatch = function (
    str, callback, aclv, options, account
) {

    var group,
        i,
        matches,
        members,
        searchRe;

    matches = [];

    searchRe = new RegExp(str, 'ig');

    // Search groups for member

    atLeastOneGroup = false;

    for (group in this.groups) {

        if (this.groups.hasOwnProperty(group)) {

            atLeastOneGroup = true;

            members = this.groups[group].members;

            for (i = 0; i < members.length; i = i + 1) {

                if (
                    (searchRe.test(members[i].name)) ||
                    (searchRe.test(members[i].uid))
                ) {

                    // FIXME: Check, if user match already exists

                    matches.push({
                        "text": members[i].name,
                        "data": members[i],
                        "icon": 'Contact'
                    });

                }

            }

        }

    }

    if (!atLeastOneGroup) {

        // No groups. Don't do anything.

        return;

    }

    callback(matches);

};

de_dieploegers_groupcalAutocomplete.prototype.setGroups = function (groups)
{

    this.groups = groups;

};