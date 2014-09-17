package de.dieploegers.groupcal.handlers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.SoapParseException;
import com.zimbra.soap.DocumentHandler;
import com.zimbra.soap.ZimbraSoapContext;

/**
 * Zimbra Group Calender extension - Get appointment cache
 *
 * Requests the appointments in the given range and returns them as
 * <appt />-objects. If an appointment has multiple instances in the requested
 * area, each instance is returned as a separate appt-object.
 *
 * <GetApptCacheRequest xmlns="urn:groupCal">
 *     <account>{Name of account}</account>
 *     <startDate>{start date as seconds since the epoch}</startDate>
 *     <endDate>{end date as seconds since the epoch}</endDate>
 * </GetApptCacheRequest>
 *
 * <GetApptCacheResponse>
 *     <appt>
 *         ... (see SearchResponse/appt)
 *     </appt>
 * </GetApptCacheResponse>
 *
 * @author Dennis Plöger <develop@dieploegers.de>
 */

public class GetApptCache extends DocumentHandler {

    /**
     * Handle the request
     * @param request The request
     * @param context The soap context
     * @return The response
     * @throws ServiceException
     */

    public Element handle(Element request, Map<String, Object> context)
        throws ServiceException {

        // Parse request

        String requestedAccount = request.getElement("account").getTextTrim();
        int requestedStart = Integer.parseInt(
            request.getElement("startDate").getTextTrim()
        );
        
        int requestedEnd = Integer.parseInt(
            request.getElement("endDate").getTextTrim()
        );

        // Build up the response

        ZimbraSoapContext zsc = getZimbraSoapContext(context);

        Element response = zsc.createElement(
            "GetApptCacheResponse"
        );
        
        // Get database information from local config
        
        String jdbcUrl = LC.get("groupcal_jdbc_url");
        String jdbcDriver = LC.get("groupcal_jdbc_driver");
        String jdbcUser = LC.get("groupcal_jdbc_user");
        String jdbcPassword = LC.get("groupcal_jdbc_password");
        
        try {
            
            // Add driver
            
            Class.forName(jdbcDriver);
        
            Connection connect = DriverManager.getConnection(
                jdbcUrl, jdbcUser, jdbcPassword
            );

            // Fetch the data from the appt-cache database
            
            Statement statement = connect.createStatement();
            String query = "select APPTDATA from APPTCACHE" +
                " where START_TIMESTAMP >= " + 
                requestedStart +
                " and END_TIMESTAMP <= " + 
                requestedEnd +
                " and ACCOUNT = '" +
                requestedAccount +
                "'";
            
            ResultSet results = statement.executeQuery(query);            
            
            while (results.next()) {
                
                Element currentAppt = Element.parseJSON(
                    results.getString("APPTDATA")
                );

                response.addNonUniqueElement(currentAppt);
                
            }

        } catch (SQLException e) {
            
            throw ServiceException.FAILURE("Error speaking to database.", e);
            
        } catch (ClassNotFoundException e) {
        
            throw ServiceException.FAILURE("Database-Driver not found.", e);
            
        } catch (SoapParseException e) {
            
            throw ServiceException.FAILURE("System error XML-handling.", e);
            
        } 
        
        return response;
        
    }

}
