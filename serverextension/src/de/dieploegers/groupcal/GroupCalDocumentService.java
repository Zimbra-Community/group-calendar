package de.dieploegers.groupcal;

import com.zimbra.soap.DocumentDispatcher;
import com.zimbra.soap.DocumentService;
import org.dom4j.Namespace;
import org.dom4j.QName;

import de.dieploegers.groupcal.handlers.*;

/**
 * Zimbra Group Calender extension - document service
 *
 * @author Dennis Plöger <develop@dieploegers.de>
 */

public class GroupCalDocumentService implements DocumentService{

    /**
     * The namespace of the whole document service
     */

    public static final Namespace namespace = Namespace.get("urn:groupCal");

    /**
     * Register the handlers of this document service
     *
     * @param dispatcher Dispatcher-object
     */

    @Override
    public void registerHandlers(DocumentDispatcher dispatcher) {

        dispatcher.registerHandler(
            QName.get(
                "GetApptCacheRequest",
                namespace
            ),
            new GetApptCache()
        );

        dispatcher.registerHandler(
            QName.get(
                "GetAvailableGroupsRequest",
                namespace
            ),
            new GetAvailableGroups()
        );

        dispatcher.registerHandler(
            QName.get(
                "GetTimespanRequest",
                namespace
            ),
            new GetTimespan()
        );

    }

}
