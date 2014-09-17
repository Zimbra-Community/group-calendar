/*
 Document   : de_dieploegers_groupcalWeekView.js
 Author     : Dennis Ploeger <develop@dieploegers.de>
 Description: Group calendar zimlet special week view without interactivity
 */

function de_dieploegers_groupcalWeekView(parent, posStyle, controller, dropTgt) {
    ZmCalWeekView.call(this, parent, posStyle, controller, dropTgt);
}

/**
 * Do a little hack, because ZmCalWeekView REQUIRES arguments to instantiate
 * properly
 *
 * http://bit.ly/LjTLRy
 *
 */

function de_dieploegers_groupcalWeekViewTmp() {

}

de_dieploegers_groupcalWeekViewTmp.prototype = ZmCalWeekView.prototype;

de_dieploegers_groupcalWeekView.prototype = new de_dieploegers_groupcalWeekViewTmp();
de_dieploegers_groupcalWeekView.prototype.constructor =
    de_dieploegers_groupcalWeekView;

// Overwrite any mouse interaction with an event

de_dieploegers_groupcalWeekView.prototype._gridMouseDownAction =
    function(
        ev,gridEl, gridLoc, isAllDay
    ) {
    
        return false;
        
    };