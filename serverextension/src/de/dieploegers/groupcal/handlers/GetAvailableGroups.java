package de.dieploegers.groupcal.handlers;

import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.zimbra.common.account.Key;
import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.cs.account.*;
import com.zimbra.soap.DocumentHandler;
import com.zimbra.soap.ZimbraSoapContext;
import org.apache.commons.lang.StringEscapeUtils;

/**
 * Zimbra Group Calender extension - Get available group calendars
 *
 * Returns the available group calendars for the currently logged in user.
 *
 * <GetAvailableGroupsRequest xmlns="urn:groupCal" />
 *
 * <GetAvailableGroupsResponse>
 *     <Group>
 *         <Name>{Name of group}</Name>
 *         <ID>{Zimbra-ID of group}</ID>
 *         <Description>{Description of group}</Description>
 *         <Members>
 *             <Member>
 *                 <UID>{Zimbra UID of member}</UID>
 *                 <Name>{name of member}</Name>
 *             </Member>
 *         </Members>
 *     </Group>
 * </GetAvailableGroupsResponse>
 *
 * @author Dennis Plöger <develop@dieploegers.de>
 */

public class GetAvailableGroups extends DocumentHandler {

    /**
     * Handle the request
     * @param request The request
     * @param context The soap context
     * @return The response
     * @throws ServiceException
     */

    @Override
    public Element handle(Element request, Map<String, Object> context)
        throws ServiceException {
        
        // Create response element
        
        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        
        Element response = zsc.createElement(
            "GetAvailableGroupsResponse"
        );
        
        // Get all distribution lists the current user is in
        
        Account currentAccount = DocumentHandler.getRequestedAccount(
            zsc
        );

        Set <String> inLists = currentAccount.getDistributionLists();
        
        Provisioning mProv = Provisioning.getInstance();
        
        // Check if the user is in sec_gcal_-groups
        
        Iterator<String> iInLists = inLists.iterator();
        
        Set <String> myGroups = new HashSet<String>();
        
        Boolean atLeastOneGroup = false;

        // Prefix, that every group calender list has

        String gcalPrefix = LC.get("groupcal_gcal_prefix");

        if (gcalPrefix.isEmpty()) {

            gcalPrefix = "gcal_";

        }

        // Prefix for the matching security group for a group calendar list

        String secGcalPrefix = LC.get("groupcal_sec_prefix");

        if (secGcalPrefix.isEmpty()) {

            secGcalPrefix = "sec_gcal_";

        }

        Pattern secPattern = Pattern.compile("^" + secGcalPrefix +"(.*)$");
        
        while (iInLists.hasNext()) {
            
            String dLID = iInLists.next();
            
            DistributionList currentDL = mProv.get(
                Key.DistributionListBy.id,
                dLID
            );

            Matcher secMatcher = secPattern.matcher(currentDL.getUid());
            
            if (secMatcher.matches()) {

                String gCalGroupName = gcalPrefix + secMatcher.group(1) +
                    "@" + currentDL.getDomainName();

                myGroups.add(gCalGroupName);
                
                atLeastOneGroup = true;
                
            }
            
        }
        
        if (!atLeastOneGroup) {
            
            // he isn't. Nothing's shared. Return empty.
            
            return response;
            
        }
        
        // Get more information about the shared groups

        for (String currentGroup : myGroups) {

            DistributionList currentList = mProv.get(
                Key.DistributionListBy.name,
                currentGroup
            );

            // Add distribution list to response

            Element groupElement = response.addNonUniqueElement("Group");
            groupElement.addUniqueElement("Name").addText(
                currentList.getCn()
            );
            groupElement.addUniqueElement("ID").addText(currentList.getUid());

            String[] currentDescription = currentList.getDescription();

            String descriptionText = "";

            // Combine descriptions, escape and replace newlines with
            // br-tags

            for (String aCurrentDescription : currentDescription) {

                descriptionText = descriptionText.concat(
                    StringEscapeUtils.escapeHtml(aCurrentDescription)
                        .replace("\n", "< br/>")
                );

            }

            groupElement.addUniqueElement("Description").addText(
                descriptionText
            );

            Element membersElement = groupElement.addUniqueElement("Members");

            for (String currentMember : currentList.getAllMembersSet()) {

                Account memberData = mProv.getAccountByName(currentMember);

                Element memberElement =
                    membersElement.addNonUniqueElement("Member");

                memberElement.addUniqueElement("UID").addText(currentMember);
                memberElement.addUniqueElement("Name").addText(
                    memberData.getDisplayName()
                );

            }

        }

        return response;
    }

}
