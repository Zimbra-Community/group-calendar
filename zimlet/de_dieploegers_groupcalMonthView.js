/*
 Document   : de_dieploegers_groupcalMonthView.js
 Author     : Dennis Ploeger <develop@dieploegers.de>
 Description: Group calendar zimlet special month view without day expansion
 */

function de_dieploegers_groupcalMonthView(parent, posStyle, controller, dropTgt) {
    ZmCalMonthView.call(this, parent, posStyle, controller, dropTgt);
}

/**
 * Do a little hack, because ZmCalMonthView REQUIRES arguments to instantiate
 * properly
 *
 * http://bit.ly/LjTLRy
 *
 */

function de_dieploegers_groupcalMonthViewTmp() {

}

de_dieploegers_groupcalMonthViewTmp.prototype = ZmCalMonthView.prototype;

de_dieploegers_groupcalMonthView.prototype = new de_dieploegers_groupcalMonthViewTmp();
de_dieploegers_groupcalMonthView.prototype.constructor =
    de_dieploegers_groupcalMonthView;

// Overwrite expandDay function with nothing, so it doesn't do anything

de_dieploegers_groupcalMonthView.prototype.expandDay =
    function () {
        return true;
    };