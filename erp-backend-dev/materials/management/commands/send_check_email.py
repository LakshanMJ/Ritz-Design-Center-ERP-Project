from django.core.management.base import BaseCommand, CommandError
from materials.scripts import supplier_inquiry_email
from materials.models import SupplierInquiry
from shared import email


class Command(BaseCommand):
    help = "sending supplier inquiry"
    body = """
<br><br>We would like to request a quotation for the materials detailed below. Please review the details and fill the missing columns with the quotation details.
<p>Expiration Date (DD/MM/YYYY):-</p>
<p>Tentative Material In House Date (DD/MM/YYYY):-</p>
<h3>Fabri
   ic
</h3>
<table cellpadding="2" cellspacing="0" border="1">
   <tr>
      <th>                                Customer Reference Code</th>
      <th>                             
         RITZ Code
      </th>
      <th>                                Customer</th>
      <th>                                Brand</th>
      <th>                                Hash ID</th>
      <th>                                Composition</th>
      <th>                                Description</th>
      <th>                                GSM</th>
      <th>                                Color</th>
      <th style="display:none !important;">                                Fabric Type</th>
      <th style="background-color:#FFA500;">                                Cutting Width</th>
      <th>                                Cutting Width Unit</th>
      <th>                                Costing Unit</th>
      <th>                                Freight Charge</th>
      <th style="background-color:#FFA500;">                                FOB Price</th>
      <th style="background-color:#FFA500;">                                CIF</th>
      <th style="background-color:#FFA500;">         
         Ex Work
      </th>
      <th style="background-color:#FFA500;">                                Ship Mode</th>
   </tr>
   <tr>
      <td width="100px">                                                                1234</td>
      <td width="100px">                                                                RITZ-1</td>
      <td width="100px">                                                                SanMar</td>
      <td width="100px">                                                                SanMar</td>
      <td width="100px">                                                                None</td>
      <td width="100px">                               
         Cotton 100%
      </td>
      <td width="100px">                                                                Discription</td>
      <td width="100px">                                                
         12
      </td>
      <td width="100px">                                                                red</td>
      <td width="100px" style="display:none !important;">                                                                Type</td>
      <td width="100px" style="background-color:#FFA500;">                                                    
      </td>
      <td width="100px">                                                                </td>
      <td width="100px">                                                                </td>
      <td width="100px">                                                                </td>
      <td width="100px" style="background-color:#FFA500;">                       
      </td>
      <td width="100px" style="background-color:#FFA500;">                                                                </td>
      <td width="100px" style="background-color:#FFA500;">                                                                </td>
      <td width="100px" style="background-color:#FFA500;">                                                                </td>
   </tr>
</table>
<img src="RITZ-LOGO.jpg"/>"""
    def handle(self, *args, **options):
        # sent_email = email.send_email(to=['aruna.g@ritzclothing.lk'], cc=[], subject='Price Inquiry For RITZ CLOTHING',
                        #  body=self.body, attachments=[])
        supplier_inquiry_email.send_supplier_inquiry_email(version_id=1)