import React, { useEffect, useState } from "react";
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector, { timelineConnectorClasses } from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent, {
  timelineOppositeContentClasses,
} from '@mui/lab/TimelineOppositeContent';
import { Box, Collapse, Grid, IconButton, Link, Typography } from "@mui/material";
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import DefaultLoader from "@/components/DefaultLoader";
import { INCOMING_PAYMENT_ENTITY, OUTGOING_PAYMENT_ENTITY, PO_CLUB_ENTITY, SUPPLIER_PO_ENTITY, SUPPLIER_PO_GRN } from "@/helpers/taskEntities/EntityTypes";
import { poClubTimeLineDetailsURL } from "@/helpers/constants/rest_urls/POUrls";
import SPODetailActivities from "./SPODetailActivities";
import GRNDetailActivities from "./GRNDetailActivities";
import { createdGrnDetailsPageURL } from "@/helpers/constants/front_end/GrnUrls";
import IncomingPaymentDetailActivities from "./IncomingPaymentDetailActivities";
import OutgoingPaymentDetailActivities from "./OutgoingPaymentDetailActivities";
import { incomingPaymentDetailPageURL, outgoingPaymentDetailPageURL } from "@/helpers/constants/front_end/FinanceUrls";

const POClubTimeLine = ({ poClubId }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [expandedStates, setExpandedStates] = useState<any>({});
  const [costingDetails, setCostingDetails] = useState<any>({});

  const handleExpandClick = (index: number, selectedId: any) => {
    setExpandedStates((prevStates: any) => ({
      ...prevStates,
      [index]: !prevStates[index],
    }));
  };

  const fetchData = () => {
    api.get(poClubTimeLineDetailsURL(poClubId))
      .then((resp: any) => {
        const costingData = resp.data;
        setCostingDetails({ ...costingData });
        const initialExpandedStates = costingData.activities.reduce((acc: any, _item: any, index: number) => {
          acc[index] = true;
          return acc;
        }, {});
        setExpandedStates(initialExpandedStates);
      })
      .catch((error: any) => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (poClubId) {
      fetchData();
    }
  }, [poClubId]);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Timeline
            sx={{
              [`& .${timelineOppositeContentClasses.root}`]: {
                flex: 0.08,
                textAlign: 'left',
              },
              [`& .${timelineConnectorClasses.root}`]: {
                flex: 1,
              },
            }}
          >
            {costingDetails.activities?.map((item: any, index: number) => (
              <TimelineItem key={index}>
                <TimelineOppositeContent color="textSecondary">
                  <Typography variant="h6">{item?.date_display}</Typography>
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color="primary" />
                  {index < costingDetails.activities.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Box width="100%">
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {item?.entity === PO_CLUB_ENTITY ? (
                        <>
                          {item?.activity}
                        </>
                      ) : (
                        <>
                          {item?.activity}
                          <Link
                            sx={{ cursor: 'pointer' }}
                            href={
                                item?.entity === SUPPLIER_PO_ENTITY
                                  ? item.supplier_po_file?.file_path
                                  : item.entity === SUPPLIER_PO_GRN
                                    ? createdGrnDetailsPageURL(item?.id)
                                    : item.entity === INCOMING_PAYMENT_ENTITY
                                      ? incomingPaymentDetailPageURL(item?.id)
                                      : item.entity === OUTGOING_PAYMENT_ENTITY
                                        ? outgoingPaymentDetailPageURL(item?.id)
                                        : '#'
                            }
                            target="_blank"
                          >
                            ( {item?.display_number} )
                          </Link>
                        </>
                      )
                      }
                      {item?.entity != PO_CLUB_ENTITY && (
                        <IconButton
                          sx={{ ml: 1 }}
                          size="small"
                          onClick={() => handleExpandClick(index, item?.id)}
                          aria-label="expand remarks"
                        >
                          {expandedStates[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      )}
                    </Typography>
                    <Collapse in={expandedStates[index]} timeout="auto" unmountOnExit>
                      <Grid container mt={1}>
                        <Grid item xs={12} sm={12} md={12}>
                          <Box
                            sx={{
                              overflowX: 'auto',
                              maxWidth: '100%',
                            }}
                          >
                            {item?.entity === SUPPLIER_PO_ENTITY ? (
                              <Box sx={{ width: '100%' }}>
                                <SPODetailActivities spoId={item?.id} />
                              </Box>
                            ) : item?.entity === SUPPLIER_PO_GRN ? (
                              <Box sx={{ width: '100%' }}>
                                <GRNDetailActivities grnId={item?.id} />
                              </Box>
                            ) : item?.entity === INCOMING_PAYMENT_ENTITY ? (
                              <Box sx={{ width: '100%' }}>
                                <IncomingPaymentDetailActivities incomingPaymentId={item?.id}/>
                              </Box>
                            ) : item?.entity === OUTGOING_PAYMENT_ENTITY ? (
                              <Box sx={{ width: '100%' }}>
                                <OutgoingPaymentDetailActivities outgoingPaymentId={item?.id} />
                              </Box>
                            ) : null}
                          </Box>
                        </Grid>
                      </Grid>
                    </Collapse>
                  </Box>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </>
      )}
    </>
  );
};

export default POClubTimeLine;