/*
 Document   : de_dieploegers_groupcal.js
 Author     : Dennis Ploeger <develop@dieploegers.de>
 Description: Group calendar zimlet
 */

// Load the Calendar functions before doing anything else

AjxDispatcher.require(["CalendarCore", "Calendar", "CalendarAppt"]);

function de_dieploegers_groupcalHandlerObject() {
}

de_dieploegers_groupcalHandlerObject.prototype = new ZmZimletBase();
de_dieploegers_groupcalHandlerObject.prototype.constructor =
    de_dieploegers_groupcalHandlerObject;

// Constants for the specific views

de_dieploegers_groupcalHandlerObject.WEEK_VIEW = 0;
de_dieploegers_groupcalHandlerObject.MONTH_VIEW = 1;

/**
 * @see ZmZimletBase::AppActive
 */

de_dieploegers_groupcalHandlerObject.prototype.appActive =
    function (appName, active) {

        if ((active) && (appName === this.appName)) {

            // Fetch available groups from backend system

            this.fetchGroups();

        }

    };

/**
 * @see ZmZimletBase::AppLaunch
 */

de_dieploegers_groupcalHandlerObject.prototype.appLaunch =
    function (appName) {

        var overview;

        if (appName === this.appName) {

            if ((this.startDate === null) ||
                (this.endDate === null)) {

                throw "System error. Could not fetch timespan.";

            }

            overview = this.app.getOverview();

            // Add search field

            this.searchField = new DwtInputField({
                parent: overview,
                hint: this.getMessage('LABEL_SEARCH')
            });

            this.searchField.getInputElement().style.width="100%";

            overview.addChild(this.searchField, 0);

            // Add AutoComplete

            this.autocomplete.handle(this.searchField.getInputElement(), null);

            // Add group tree

            this.groupTree = new DwtTree({
                parent: overview,
                style: DwtTree.SINGLE_STYLE
            });

            this.groupTree.addSelectionListener(
                new AjxListener(
                    this,
                    this.handleTreeSelection
                )
            );

            overview.addChild(this.groupTree, 1);

            // Create our display composite

            this.output = this.app.getController().getView();
            this.output.addClassName("GroupCalView");

            // Create our very own calendar controller

            this.calendarController = new ZmCalViewController(
                this.output,
                appCtxt.getApp(ZmId.APP_CALENDAR)
            );

            // Create a fake controller to disable some clicks

            this.app.getController().getView().getController = function() {
                return {
                    setDate: function (a) {
                        return true;
                    },
                    show: function (a) {
                        return true;
                    },
                    getDate: function (a) {
                        return 0;
                    },
                    getKeyMapName: function () {
                        return "";
                    },
                    _restoreFocus: function () {
                        return true;
                    },
                    _newListener: function () {
                        return true;
                    }

                };
            };

            // Create toolbar

            this.toolbar = this.app.getToolbar();

            // Previous

            this.toolbar.createButton("groupcalToolbarPrevious", {
                text: this.getMessage("TOOLBAR_PREVIOUS"),
                tooltip: this.getMessage("TOOLBAR_PREVIOUS_TOOLTIP"),
                image: "LeftArrow"
            });

            this.toolbar.addSelectionListener(
                "groupcalToolbarPrevious",
                new AjxListener(
                    this,
                    this.handleCalendarNavigation,
                    [ -1 ]
                )
            );

            // Today

            this.toolbar.createButton("groupcalToolbarToday", {
                text: this.getMessage("TOOLBAR_TODAY"),
                tooltip: this.getMessage("TOOLBAR_TODAY_TOOLTIP"),
                image: "Date"
            });

            this.toolbar.addSelectionListener(
                "groupcalToolbarToday",
                new AjxListener(
                    this,
                    this.handleCalendarNavigation,
                    [ 0 ]
                )
            );

            // Next

            this.toolbar.createButton("groupcalToolbarNext", {
                text: this.getMessage("TOOLBAR_NEXT"),
                tooltip: this.getMessage("TOOLBAR_NEXT_TOOLTIP"),
                image: "RightArrow"
            });

            this.toolbar.addSelectionListener(
                "groupcalToolbarNext",
                new AjxListener(
                    this,
                    this.handleCalendarNavigation,
                    [ 1 ]
                )
            );

            this.toolbar.addSeparator();

            // Week view

            this.toolbar.createButton("groupcalToolbarWeekView", {
                text: this.getMessage("TOOLBAR_WEEK"),
                tooltip: this.getMessage("TOOLBAR_WEEK_TOOLTIP"),
                image: "WeekView",
                style: DwtButton.TOGGLE_STYLE
            });

            if (Number(this.lastViewMode) ===
                de_dieploegers_groupcalHandlerObject.WEEK_VIEW
                ) {

                this.toolbar.getButton(
                    "groupcalToolbarWeekView"
                ).setSelected(true);

            }

            this.toolbar.addSelectionListener(
                "groupcalToolbarWeekView",
                new AjxListener(
                    this,
                    this.handleCalendarSwitchView,
                    [ de_dieploegers_groupcalHandlerObject.WEEK_VIEW ]
                )
            );

            // Month view

            this.toolbar.createButton("groupcalToolbarMonthView", {
                text: this.getMessage("TOOLBAR_MONTH"),
                tooltip: this.getMessage("TOOLBAR_MONTH_TOOLTIP"),
                image: "MonthView",
                style: DwtButton.TOGGLE_STYLE
            });

            if (Number(this.lastViewMode) ===
                de_dieploegers_groupcalHandlerObject.MONTH_VIEW
                ) {

                this.toolbar.getButton(
                    "groupcalToolbarMonthView"
                ).setSelected(true);

            }

            this.toolbar.addSelectionListener(
                "groupcalToolbarMonthView",
                new AjxListener(
                    this,
                    this.handleCalendarSwitchView,
                    [ de_dieploegers_groupcalHandlerObject.MONTH_VIEW ]
                )
            );

            this.toolbar.addSeparator();

            // Legend

            this.toolbar.createButton("groupcalToolbarLegend", {
                text: this.getMessage("TOOLBAR_LEGEND"),
                tooltip: this.getMessage("TOOLBAR_LEGEND_TOOLTIP"),
                image: "GroupSchedule"
            });

            this.legendButton = this.toolbar.getButton("groupcalToolbarLegend");

            this.toolbar.addSeparator();

            this.infoPane = new DwtLabel({
                parent: this.toolbar,
                style: DwtLabel.IMAGE_LEFT | DwtLabel.ALIGN_LEFT
            });

            this.infoPane.setImage("Information");

            this.infoPane.setText(AjxMessageFormat.format(
                this.getMessage("TOOLBAR_INFO"),
                [
                    AjxMessageFormat.format(I18nMsg.formatDateTime,
                        [
                            AjxDateFormat.format(
                                I18nMsg.formatDateFull,
                                this.startDate
                            ),
                            AjxDateFormat.format(
                                I18nMsg.formatTimeMedium,
                                this.startDate
                            )
                        ]),
                    AjxMessageFormat.format(I18nMsg.formatDateTime,
                        [
                            AjxDateFormat.format(
                                I18nMsg.formatDateFull,
                                this.endDate
                            ),
                            AjxDateFormat.format(
                                I18nMsg.formatTimeMedium,
                                this.endDate
                            )
                        ])
                ]
            ));

            this.toolbar.addChild(this.infoPane);

        }

    };

/**
 * Build up the overview tree
 */

de_dieploegers_groupcalHandlerObject.prototype.buildOverview =
    function () {

        var currentGroup,
            currentItem,
            currentMember,
            groupHeader,
            i,
            key;

        // Start from scratch

        this.groupTree.removeChildren();

        this.itemCache = {};
        this.itemCache.person = {};
        this.itemCache.group = {};

        // Tree header

        groupHeader = new DwtHeaderTreeItem({
            parent: this.groupTree,
            text: this.getMessage("OVERVIEW_HEADER"),
            selectable: false,
            className: "overviewHeader",
            imageInfo: "Group"
        });

        groupHeader.setExpanded(true);

        // Walk through each group and create the appropriate tree items

        for (key in this.groups) {

            if (this.groups.hasOwnProperty(key)) {

                currentGroup = this.groups[key];

                currentItem = new DwtTreeItem({
                    parent: this.groupTree,
                    text: currentGroup.name,
                    selectable: true,
                    imageInfo: "Group"
                });

                this.itemCache.group[key] = currentItem;

                currentItem.setToolTipContent(currentGroup.description);

                currentItem.setData("id", key);
                currentItem.setData("type", "group");
                currentItem.setData("description", currentGroup.name);

                for (i = 0; i < currentGroup.members.length; i = i + 1) {

                    // Create tree items for members

                    currentMember = new DwtTreeItem({
                        parent: currentItem,
                        text: currentGroup.members[i].name,
                        selectable: true,
                        imageInfo: "Person"
                    });

                    currentMember.showCheckBox(true);

                    this.itemCache.person[currentGroup.members[i].uid] =
                        currentMember;

                    currentMember.setData("id", currentGroup.members[i].uid);
                    currentMember.setData("type", "person");
                    currentItem.setData(
                        "description",
                        currentGroup.members[i].name
                    );

                }

            }

        }

        // Focus the search field

        this.searchField.focus();

    };

/**
 * Create the zimlet app
 */

de_dieploegers_groupcalHandlerObject.prototype.buildApp =
    function () {

        // Create app

        this.appName = this.createApp(
            this.getMessage("LABEL_APP"),
            "Group",
            this.getMessage("TOOLTIP_APP")
        );

        this.app = appCtxt.getApp(this.appName);

    };

/**
 * Fetch available group information from backend
 */

de_dieploegers_groupcalHandlerObject.prototype.fetchGroups =
    function () {

        var soapDoc;

        // Fetch from Backend

        soapDoc = AjxSoapDoc.create("GetAvailableGroupsRequest", "urn:groupCal");

        appCtxt.getAppController().sendRequest(
            {
                soapDoc: soapDoc,
                asyncMode: true,
                callback: new AjxCallback(
                    this,
                    this.handleFetchGroups
                )
            }
        );

    };

/**
 * Fetch the calendar of a person
 *
 * @param uid UID (=mailaddress) of person
 * @param description Description (name) of the person
 * @param personIndex Colorindex for this person
 * @param personMax   Maximum fetched person in the current run
 */

de_dieploegers_groupcalHandlerObject.prototype.fetchPersonData =
    function (uid, description, personIndex, personMax) {

        var soapDoc;

        // Fetch appointments from appointment cache

        soapDoc = AjxSoapDoc.create("GetApptCacheRequest", "urn:groupCal");
        soapDoc.set("account", uid);
        soapDoc.set("startDate", this.startDate.getTime() / 1000);
        soapDoc.set("endDate", this.endDate.getTime() / 1000);

        appCtxt.getAppController().sendRequest(
            {
                soapDoc: soapDoc,
                asyncMode: true,
                callback: new AjxCallback(
                    this,
                    this.handleFetchPersonData,
                    [ uid, description, personIndex, personMax ]
                )
            }
        );

    };

/**
 * Handle an autocomplete action => Select the user
 *
 * @param address   Address (?)
 * @param el        Input-Element
 * @param match     Match-Object
 */

de_dieploegers_groupcalHandlerObject.prototype.handleAutocomplete =
    function (address, el, match) {

        var i,
            item;

        // Clean the input field

        el.value = '';

        // Select the first element matching in the tree

        for (i = 0; i < this.groupTree.getTreeItemList().length; i = i + 1) {

            item = this.groupTree.getTreeItemList()[i];

            if (item.getData('id') == match.data.uid) {

                this.groupTree.setSelection(item);

                el.focus();

                return;

            }

        }

    };

/**
 * Handle clicks on Previous, Next and today
 *
 * @param navValue Navigation mode: -1 previous, 0 today, 1 next
 * @param ev DwtEvent from the click
 */

de_dieploegers_groupcalHandlerObject.prototype.handleCalendarNavigation =
    function (navValue, ev) {

        var rollField;

        if (Number(this.lastViewMode) ===
            de_dieploegers_groupcalHandlerObject.WEEK_VIEW
            ) {

            rollField = AjxDateUtil.WEEK;

        } else if (
            Number(this.lastViewMode) ===
                de_dieploegers_groupcalHandlerObject.MONTH_VIEW
            ) {

            rollField = AjxDateUtil.MONTH;

        }

        if (navValue === 0) {

            // Today

            this.currentViewDate = new Date();

        } else {

            // Forwards or Backwards

            this.currentViewDate = AjxDateUtil.roll(
                this.currentViewDate,
                rollField,
                navValue
            );

        }

        this.rebuildCalendar();

    };

/**
 * Handle clicks on Week or Month view
 *
 * @param ev DwtEvent
 */

de_dieploegers_groupcalHandlerObject.prototype.handleCalendarSwitchView =
    function (viewMode, ev) {

        if (Number(this.lastViewMode) ===
            de_dieploegers_groupcalHandlerObject.WEEK_VIEW
            ) {

            this.toolbar.getButton(
                "groupcalToolbarMonthView"
            ).setSelected(true);

            this.toolbar.getButton(
                "groupcalToolbarWeekView"
            ).setSelected(false);

        }

        if (Number(this.lastViewMode) ===
            de_dieploegers_groupcalHandlerObject.MONTH_VIEW
            ) {

            this.toolbar.getButton(
                "groupcalToolbarWeekView"
            ).setSelected(true);

            this.toolbar.getButton(
                "groupcalToolbarMonthView"
            ).setSelected(false);

        }

        this.lastViewMode = viewMode;

        this.setUserProperty("lastViewMode", this.lastViewMode, true);

        this.rebuildCalendar();

    };

/**
 * Callback after groups are fetched
 *
 * @param response Response from Soap-Call
 */

de_dieploegers_groupcalHandlerObject.prototype.handleFetchGroups =
    function (response) {

        var a,
            currentData,
            i,
            lastSelectedIdValid,
            responseGroups;

        if (response.isException()) {

            throw response.getException();

        }

        if (
            !response.getResponse().
                GetAvailableGroupsResponse.hasOwnProperty("Group")
        ) {

            // There are no groups. Return empty.

            return;

        }

        responseGroups =
            [].concat(response.getResponse().GetAvailableGroupsResponse.Group);

        if (this.doCreateApp) {

            // We have groups, we can build the app

            this.doCreateApp = false;

            this.buildApp();

            // Return for now.

            return;

        }

        // Build up group data from response

        this.groups = {};

        lastSelectedIdValid = false;

        for (i = 0; i < responseGroups.length; i = i + 1) {

            currentData = {};

            currentData.name = responseGroups[i].Name._content;
            currentData.description =
                responseGroups[i].Description._content;

            currentData.members = [];

            for (a = 0;
                 a < responseGroups[i].Members.Member.length;
                 a = a + 1
                ) {

                if ((this.lastSelectedType === "person") &&
                    (this.lastSelectedId === responseGroups[
                        i
                        ].Members.Member[a].UID._content)) {

                    lastSelectedIdValid = true;

                }

                currentData.members.push({
                    uid: responseGroups[i].Members.Member[a].UID._content,
                    name:
                        responseGroups[i].Members.Member[a].Name._content
                });

            }

            if ((this.lastSelectedType === "group") &&
                (this.lastSelectedId === responseGroups[i].ID._content)
                ) {

                lastSelectedIdValid = true;

            }

            this.groups[responseGroups[i].ID._content] = currentData;

        }

        // Update autocomplete data

        this.autocompleteHandler.setGroups(this.groups);

        // Build/Refresh Overview

        this.buildOverview();

        // Check, if no groups are available

        if (this.groupCount === 0) {

            this.showNoGroups();

            return;

        }

        // Check, if lastSelectedId and lastSelectedType are still valid

        if (
            (!lastSelectedIdValid) ||
                (!AjxVector.fromArray(["person", "group"]).contains(
                    this.lastSelectedType
                ))
            ) {

            // It is not. Unset it.

            this.setUserProperty("lastSelectedId", null);
            this.setUserProperty("lastSelectedType", null, true);

            this.lastSelectedId = null;
            this.lastSelectedType = null;

        } else {

            this.groupTree.setSelection(
                this.itemCache[this.lastSelectedType][this.lastSelectedId]
            );

            return true;

        }

        // From here on, no selection has been made. Show a info page
        // in the content-pane. TODO

    };

/**
 * Handle the server response of the person's calendar
 *
 * @param uid      The person's uid
 * @param description Description (name) of the person
 * @param personIndex Colorindex for this person
 * @param personMax   Maximum fetched person in the current run
 * @param response The server response
 */

de_dieploegers_groupcalHandlerObject.prototype.handleFetchPersonData =
    function (uid, description, personIndex, personMax, response) {

        var appts,
            i;

        if (response.isException()) {

            throw response.getException();

        }

        this.personCount = this.personCount + 1;

        appts = response.getResponse().GetApptCacheResponse.Envelope;

        if (appts) {

            this.appointments[uid] = {
                "color": ZmOrganizer.COLOR_VALUES[personIndex],
                "description": description,
                "appointments": []
            };

            for (i = 0; i < appts.length; i = i + 1) {

                this.appointments[uid].appointments.push(
                    appts[i]
                );

            }

        }

        if (this.personCount === personMax) {

            // All persons have been loaded. Rebuild the calendar

            this.rebuildCalendar();

        }

    };

/**
 * Handles the response of the GetTimespan-Call
 *
 * @param response Response from the server
 */

de_dieploegers_groupcalHandlerObject.prototype.handleGetTimespan =
    function (response) {

        var getTimespan;

        if (response.isZmCsfeException) {

            if (response.code == "service.NOT_FOUND") {

                // No timespan available. Remove app and show message

                appCtxt.getAppController().getAppChooser().removeButton(
                    this.app.getName()
                );

                this.displayErrorMessage(
                    this.getMessage("ERROR_NOTIMESPAN"),
                    null,
                    this.getMessage("ERROR_TITLE")
                );

                return true;

            } else {

                throw response.getException();

            }

        }

        getTimespan = response.getResponse().GetTimespanResponse;

        this.startDate = new Date(getTimespan.start._content * 1000);
        this.endDate = new Date(getTimespan.end._content * 1000);

    };

/**
 * Handle selections in the overview tree
 *
 * @param ev DwtEvent of the selection
 */

de_dieploegers_groupcalHandlerObject.prototype.handleTreeSelection =
    function (ev) {

        var currentItem,
            i;

        if (ev.detail !== DwtTree.ITEM_SELECTED) {
            return;
        }

        currentItem = ev.item;

        this.lastSelectedId = currentItem.getData("id");
        this.lastSelectedType = currentItem.getData("type");

        this.setUserProperty("lastSelectedId", this.lastSelectedId);
        this.setUserProperty("lastSelectedType", this.lastSelectedType,
            true
        );

        this.personCount = 0;
        this.appointments = {};

        if (currentItem.getData("type") === "person") {

            // A person leaf was selected

            this.fetchPersonData(
                currentItem.getData("id"),
                currentItem.getData("description"),
                1,
                1
            );

        } else {

            // A group leaf was selected. Expand it

            currentItem.setExpanded(true, false, true);

            // And load the data

            for (
                i = 0;
                i < this.groups[currentItem.getData("id")].members.length;
                i = i + 1
                ) {

                this.fetchPersonData(
                    this.groups[currentItem.getData("id")].members[i].uid,
                    this.groups[currentItem.getData("id")].members[i].name,
                    i + 1,
                    this.groups[currentItem.getData("id")].members.length
                );

            }

        }

    };

/**
 * Initialise Zimlet
 */

de_dieploegers_groupcalHandlerObject.prototype.init =
    function () {

        var callback,
            soapDoc;

        this.groups = {};
        this.legendMenu = null;

        // Load properties

        this.lastSelectedType = this.getUserProperty("lastSelectedType");
        this.lastSelectedId = this.getUserProperty("lastSelectedId");
        this.lastViewMode = this.getUserProperty("lastViewMode");

        if (typeof this.lastViewMode === "undefined") {

            this.lastViewMode = de_dieploegers_groupcalHandlerObject.WEEK_VIEW;
            this.setUserProperty("lastViewMode", this.lastViewMode, true);

        }

        // Fetch groups now and if groups exist, create app

        this.doCreateApp = true;

        this.fetchGroups();

        this.controller = null;
        this.calendarView = null;

        // Get maximum timespan from server

        this.startDate = null;
        this.endDate = null;

        soapDoc = AjxSoapDoc.create("GetTimespanRequest", "urn:groupCal");

        callback = new AjxCallback(
            this,
            this.handleGetTimespan
        );

        appCtxt.getRequestMgr().sendRequest(
            {
                soapDoc: soapDoc,
                asyncMode: true,
                callback: callback,
                errorCallback: callback
            }
        );

        // Set current view date to now

        this.currentViewDate = new Date();

        // Create autocomplete handler

        this.autocompleteHandler = new de_dieploegers_groupcalAutocomplete();

        this.autocomplete = new ZmAutocompleteListView({
            dataClass: this.autocompleteHandler,
            compCallback: new AjxCallback(
                this,
                this.handleAutocomplete
            )
        });

    };

/**
 * Rebuild the calendar view with a calendar containing the current
 * fetched appointments in this.appointment
 */

de_dieploegers_groupcalHandlerObject.prototype.rebuildCalendar =
    function () {

        var apptList,
            apptNode,
            currentLegend,
            funcIsReadOnly,
            i,
            instNode,
            outputSize,
            tmpAppt,
            uid,
            viewSize;

        // Build up the calendar view

        if (this.calendarView) {

            this.calendarView.dispose();

        }

        if (Number(this.lastViewMode) ===
            de_dieploegers_groupcalHandlerObject.WEEK_VIEW
            ) {

            this.calendarView = new de_dieploegers_groupcalWeekView(
                this.output,
                DwtControl.ABSOLUTE_STYLE,
                this.calendarController
            );

        } else if (
            Number(this.lastViewMode) ===
                de_dieploegers_groupcalHandlerObject.MONTH_VIEW
            ) {

            this.calendarView = new de_dieploegers_groupcalMonthView(
                this.output,
                DwtControl.ABSOLUTE_STYLE,
                this.calendarController
            );

        }

        this.calendarView.setDate(this.currentViewDate, null, false);

        outputSize = this.output.getSize();

        this.calendarView.setBounds(0,0, outputSize.x, outputSize.y);

        apptList = new AjxVector();

        // Refresh the legend

        if (this.legendMenu) {

            this.legendMenu.dispose();

        }

        this.legendMenu = new DwtMenu({
            parent: this.legendButton
        });

        this.legendButton.setMenu(this.legendMenu);

        funcIsReadOnly = function () {
            return true;
        };

        for (uid in this.appointments) {

            // Create fake "calendar" for dynamic color-assignment

            if (this.appointments.hasOwnProperty(uid)) {

                appCtxt.cacheSet("groupcal_cal_" + uid, {

                    rgb: this.appointments[uid].color,
                    isReadOnly: funcIsReadOnly,
                    link: true

                });

                // Add information to the legend

                currentLegend = new DwtMenuItem({

                    parent: this.legendMenu

                });

                currentLegend.setText(this.appointments[uid].description);
                currentLegend.setTextBackground(this.appointments[uid].color);

                // Now, fill the apptList as a data base for the calendar view

                for (i = 0;
                     i < this.appointments[uid].appointments.length;
                     i = i + 1
                    ) {

                    apptNode = this.appointments[uid].appointments[i];
                    instNode = apptNode.inst;

                    tmpAppt = ZmAppt.createFromDom(
                        apptNode,
                        { list: apptList },
                        instNode
                    );

                    tmpAppt.folderId = "groupcal_cal_" + uid;

                    tmpAppt.message =
                        new ZmMailMsg(tmpAppt.invId || tmpAppt.id);

                    // We have to fake some things

                    tmpAppt._orig = tmpAppt;
                    tmpAppt._orig.updateParticipantStatus = function () {
                        return true;
                    };

                    apptList.add(tmpAppt);

                }

            }

        }

        // Force refresh of calendar view

        this.calendarView.set(apptList, true);

        // Focus the search field

        this.searchField.focus();

    };