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
 * Zimbra Group Calender extension - Get available timespan
 * <p>
 * Returns the available timespan, that is available in the groupcal cache
 * database.
 *
 * <GetTimespanRequest xmlns="urn:groupCal" />
 *
 * <GetTimespanRespone>
 * <start>{start time in seconds since the epoch}</start>
 * <end>{end time in seconds since the epoch}</end>
 * </GetTimespanRespone>
 *
 * @author Dennis Plöger <develop@dieploegers.de>
 */

public class GetTimespan extends DocumentHandler {
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

        // Create response

        ZimbraSoapContext zsc = getZimbraSoapContext(context);

        Element response = zsc.createElement(
                "GetTimespanResponse"
        );

        try {
            Connection connection = DriverManager.getConnection(db_connect_string);
            PreparedStatement queryApp = null;
            ResultSet results = null;
            if (!connection.isClosed()) {
                //this is not really a prepared statement, possible SQL injection, but it is a one-table caching db, so perhaps the risk is acceptable?
                queryApp = connection.prepareStatement("select min(START_TIMESTAMP) as START," +
                        " max(END_TIMESTAMP) as END" +
                        " from APPTCACHE");
                results = queryApp.executeQuery();
            }

            while (results.next()) {

                String startTime = results.getString("START");
                String endTime = results.getString("END");

                if (startTime == null || endTime == null) {

                    throw ServiceException.NOT_FOUND("No data available.");

                }

                Element elStart = response.addUniqueElement("start");
                Element elEnd = response.addUniqueElement("end");

                elStart.setText(startTime);
                elEnd.setText(endTime);
            }
            connection.close();

        } catch (Exception e) {
            throw ServiceException.FAILURE("Error speaking to database.", e);

        }

        return response;

    }

}
