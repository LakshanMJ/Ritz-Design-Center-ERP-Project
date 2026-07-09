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
import GeneralSupplierPOs from "@/views/general_purchase_order/GeneralSupplierPos";
import PurchaseOrderClubActivities from "@/views/pcl_activities/costing/PurchaseOrderClubActivities";
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { costingTimeLineDetails } from "@/helpers/constants/RestUrls";
import { generalPurchaseOrderDetailsPageURL, purchaseOrderClubDetailsPageURL } from "@/helpers/constants/front_end/POUrls";
import DefaultLoader from "@/components/DefaultLoader";
import { GENERAL_PO_ENTITY, PO_CLUB_ENTITY } from "@/helpers/taskEntities/EntityTypes";

const CostingTimeLine = ({ orderId, versionId }: any) => {
  const orderCostingVersionKey = 'order_costing_version';
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
    api.get(costingTimeLineDetails(versionId))
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
    if (versionId) {
      fetchData();
    }
  }, [versionId]);

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
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {item?.entity === orderCostingVersionKey ? (
                        <>
                          {item?.activity}
                        </>
                      ) : (
                        <>
                          {item?.activity}
                          <Link
                            sx={{ cursor: 'pointer' }}
                            href={
                              item.entity === GENERAL_PO_ENTITY
                                ? generalPurchaseOrderDetailsPageURL(item?.id)
                                : item.entity === PO_CLUB_ENTITY
                                  ? purchaseOrderClubDetailsPageURL(item?.id)
                                  : '#'
                            }
                            target="_blank"
                          >
                            ( {item.display_number} )
                          </Link>
                        </>
                      )
                      }
                      {item?.entity != orderCostingVersionKey && (
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
                              {item?.entity === GENERAL_PO_ENTITY ? (
                              <Box sx={{ width: '100%' }}>
                                 <GeneralSupplierPOs sourceId={item?.id} type={false} />
                              </Box>
                            ) : item?.entity === PO_CLUB_ENTITY ? (
                              <Box sx={{ width: '100%' }}>
                                 <PurchaseOrderClubActivities purchaseOrdersSet={item?.pos} />
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

export default CostingTimeLine;