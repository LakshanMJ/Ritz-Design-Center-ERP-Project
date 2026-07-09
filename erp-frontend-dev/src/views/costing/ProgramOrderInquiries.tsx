import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import { Typography, Box, Grid, Divider, List, ListItem } from '@mui/material';
import { green, grey } from '@mui/material/colors';
import React, { useEffect, useState } from 'react'
import * as RestUrls from '../../helpers/constants/RestUrls';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { useRouter } from 'next/router';
import { costingOrderEditURL, orderSummaryVersionURL, } from '@/helpers/constants/FrontEndUrls';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CheckIcon from '@mui/icons-material/Check';

const ProgramInquiries = ({ orderInquiry, closeModal,}: any) => {

  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false);
  const [orderInquiryList, setOrderInquiryList] = useState<any>([]);
  const fetchProgramOrderInquiriesList = () => {
    setIsLoading(true);
    api.get(RestUrls.programOrderInquiriesURL(orderInquiry.order_program_id))
      .then((resp) => {
        const resdata = resp?.data || [];
        setOrderInquiryList([...resdata]);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsLoading(false));

  };

    
const handleListClickCompletedInquiry = (OrderId:number,versionId:number) => {
  router.replace(orderSummaryVersionURL(OrderId, versionId));

}
const handleListClickInCompletedInquiry = (OrderId:number) => {
  router.replace(costingOrderEditURL(OrderId));

}

  const filteredComoletedOrderist = orderInquiryList.filter((inquiry: any) => inquiry.state === 'general_information_complete');
  const filteredInComoletedOrderList = orderInquiryList.filter((inquiry: any) => inquiry.state === 'open');

  useEffect(() => {
    if (orderInquiry.order_program_id > 0) {
      fetchProgramOrderInquiriesList()
    }

  }, [orderInquiry])

  return (
    <>
      <Grid container>
        {isLoading ? (
          <Grid item xs={12}>
            <DefaultLoader />
          </Grid>
        ) : (
          <>
            <Grid item xs={12}>
              <Typography sx={{ marginTop: '1%', fontWeight: '700' }}>Current reviewed Order Inquiries</Typography>
              {filteredComoletedOrderist.length === 0 ? (
                <Typography sx={{ fontWeight: '300', textAlign: 'center' }}>There are no reviewed order inquiries.</Typography>
              ) : (
                <List>
                  {filteredComoletedOrderist.map((completedInquiry: any) => (
                    <ListItem
                      key={completedInquiry.id}
                      value={completedInquiry.id}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: grey[200],
                        },
                        backgroundColor: completedInquiry.id == orderInquiry.id ? green[50] : "inherit",
                      }}
                       onClick={() => handleListClickCompletedInquiry(completedInquiry.id,completedInquiry.versions[0].id)}
                    >
                       <CheckIcon  sx={{ marginRight: '8px', color: 'green' }} />
                      <span>   {completedInquiry.style_number}</span>
                   
                    </ListItem>
                  ))}
                </List>
              )}
              <Divider />
            </Grid>

            <Grid item xs={12}>
              
            {filteredInComoletedOrderList.length !== 0 && (
                <>
                  <Typography sx={{ marginTop: '1%', fontWeight: '700' }}>Need to review</Typography>
                  <List>
                  {filteredInComoletedOrderList.map((inCompletedInquiry: any, index:any) => (
                    <ListItem
                      key={inCompletedInquiry.id}
                      value={inCompletedInquiry.id}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: grey[200],
                        },
                      }}
                      onClick={() => handleListClickInCompletedInquiry(inCompletedInquiry.id)}
                    >
                      <FiberManualRecordIcon  sx={{ marginRight: '8px', color: '#1976d2' }} /> 
                      <span>Order Inquiry {index + 1}</span>
                    </ListItem>
                  ))}
                </List>
                </>
              )}
            </Grid>
          </>
        )}
      </Grid>
    </>
  )
}

export default ProgramInquiries;
