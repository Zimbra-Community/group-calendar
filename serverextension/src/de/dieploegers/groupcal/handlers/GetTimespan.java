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
import com.zimbra.soap.DocumentHandler;
import com.zimbra.soap.ZimbraSoapContext;

/**
 * Zimbra Group Calender extension - Get available timespan
 *
 * Returns the available timespan, that is available in the groupcal cache
 * database.
 *
 * <GetTimespanRequest xmlns="urn:groupCal" />
 *
 * <GetTimespanRespone>
 *     <start>{start time in seconds since the epoch}</start>
 *     <end>{end time in seconds since the epoch}</end>
 * </GetTimespanRespone>
 *
 * @author Dennis Plöger <develop@dieploegers.de>
 */

public class GetTimespan extends DocumentHandler {

    /**
     * Handle the request
     * @param request The request
     * @param context The soap context
     * @return The response
     * @throws ServiceException
     */

    public Element handle(Element request, Map<String, Object> context)
        throws ServiceException {

        // Create response

        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        
        Element response = zsc.createElement(
            "GetTimespanResponse"
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

            // Query timespan
            
            Statement statement = connect.createStatement();
            String query = "select min(START_TIMESTAMP) as START," +
                " max(END_TIMESTAMP) as END" +
                " from APPTCACHE";
            
            ResultSet results = statement.executeQuery(query);
            
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

        } catch (SQLException e) {
            
            throw ServiceException.FAILURE("Error speaking to database.", e);
            
        } catch (ClassNotFoundException e) {
        
            throw ServiceException.FAILURE("Database-Driver not found.", e);
            
        }
        
        return response;
        
    }

}
