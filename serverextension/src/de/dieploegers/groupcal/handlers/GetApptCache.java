package de.dieploegers.groupcal.handlers;

import java.io.FileInputStream;
import java.io.IOException;
import java.sql.*;
import java.util.Map;
import java.util.Properties;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.soap.DocumentHandler;
import com.zimbra.soap.ZimbraSoapContext;

/**
 * Zimbra Group Calender extension - Get appointment cache
 * <p>
 * Requests the appointments in the given range and returns them as
 * <appt />-objects. If an appointment has multiple instances in the requested
 * area, each instance is returned as a separate appt-object.
 *
 * <GetApptCacheRequest xmlns="urn:groupCal">
 * <account>{Name of account}</account>
 * <startDate>{start date as seconds since the epoch}</startDate>
 * <endDate>{end date as seconds since the epoch}</endDate>
 * </GetApptCacheRequest>
 *
 * <GetApptCacheResponse>
 * <appt>
 * ... (see SearchResponse/appt)
 * </appt>
 * </GetApptCacheResponse>
 *
 * @author Dennis Plöger <develop@dieploegers.de>
 */

public class GetApptCache extends DocumentHandler {
    final String db_connect_string = this.getDbConnectionString();

    private String getDbConnectionString() {
        Properties prop = new Properties();
        try {
            FileInputStream input = new FileInputStream("/opt/zimbra/lib/ext/de_dieploegers_groupcal/db.properties");
            prop.load(input);
            input.close();
            return prop.getProperty("db_connect_string");
        } catch (IOException ex) {
            ex.printStackTrace();
            return "";
        }
    }

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


        try {

            Connection connection = DriverManager.getConnection(db_connect_string);
            PreparedStatement queryApp = null;
            ResultSet results = null;
            if (!connection.isClosed()) {
                //this is not really a prepared statement, possible SQL injection, but it is a one-table caching db, so perhaps the risk is acceptable?
                queryApp = connection.prepareStatement("select APPTDATA from APPTCACHE" +
                        " where START_TIMESTAMP >= " +
                        requestedStart +
                        " and END_TIMESTAMP <= " +
                        requestedEnd +
                        " and ACCOUNT = '" +
                        requestedAccount +
                        "'");
                results = queryApp.executeQuery();
            }

            while (results.next()) {

                Element currentAppt = Element.parseJSON(
                        results.getString("APPTDATA")
                );

                response.addNonUniqueElement(currentAppt);

            }
            connection.close();

        } catch (Exception e) {
            throw ServiceException.FAILURE("Error speaking to database.", e);
        }

        return response;

    }

}
