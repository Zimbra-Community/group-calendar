package de.dieploegers.groupcal;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.extension.ExtensionException;
import com.zimbra.cs.extension.ZimbraExtension;

/**
 * Zimbra Group Calender extension - server extension
 *
 * @author Dennis Plöger <develop@dieploegers.de>
 */

public class GroupCalExtension implements ZimbraExtension{

    /**
     * Destructor
     */

    @Override
    public void destroy() {
        // Nothing to do
    }

    /**
     * Return the name of this extension
     *
     * @return the name
     */

    @Override
    public String getName() {
        return "GroupCalExtension";
    }

    /**
     * Initialize the extension
     *
     * @throws ExtensionException
     * @throws ServiceException
     */

    @Override
    public void init() throws ExtensionException, ServiceException {

        com.zimbra.soap.SoapServlet.addService(
            "SoapServlet",
            new GroupCalDocumentService()
        );


    }

}
