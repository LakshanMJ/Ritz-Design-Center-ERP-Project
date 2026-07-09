import { Timeline, TimelineConnector, TimelineContent, TimelineDot, TimelineItem, TimelineOppositeContent, TimelineSeparator } from "@mui/lab";
import { Box, Card, Tooltip, Typography } from "@mui/material";
import DoneIcon from '@mui/icons-material/Done';
import WarningIcon from '@mui/icons-material/Warning';
import { useState } from "react";
import RitzModal from "@/components/Ritz/RitzModal";
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

const TransportTimeline = ({events, timelineType}:{events:any;timelineType:any}) => {

    const [warningClicked, setWarningClicked] = useState(false);
    const [delayInfo, setDelayInfo] = useState<{ days: number; reason: string } | null>(null);
    console.log(events,'events')
    return(
        <>
            <Timeline position="right">
                {events.map((event:any, index:any) => (
                    <TimelineItem key={index}>
                    {/* <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pl: 2 }}>
                        <TimelineOppositeContent variant="body2" color="text.secondary" sx={{ m: 0 }}>
                            {event?.event_date || "--"}
                        </TimelineOppositeContent>
                        <WarningIcon fontSize="small" color="warning" />
                    </Box> */}
                    <TimelineOppositeContent
                        sx={{
                            pr: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            textAlign: 'right',
                        }}
                        >
                        {event?.delayed && (
                            <Box
                                component="span"
                                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mr: 0.5 }}
                                onClick={() => {
                                    setWarningClicked(true);
                                    setDelayInfo({
                                        days: event.number_of_delayed_days,
                                        reason: event.delay_reason,
                                    });
                                }}
                            >  
                            <Tooltip title="View Variation Analysis" arrow>
                                <WarningIcon fontSize="small" sx={{ color: 'error.main' }} />
                            </Tooltip>
                            </Box>
                        )}

                        <Typography variant="body2" color="text.secondary">
                            {event?.event_date || "--"}
                        </Typography>
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                        {index !== 0 && <TimelineConnector sx={{ bgcolor: "black" }} />}
                        <TimelineDot

                        sx={{
                            background: timelineType === "plan"
                                ? "linear-gradient(145deg, #2196F3, #1565C0)"
                                : event?.event_date
                                ? "linear-gradient(145deg, #4CAF50, #2E7D32)"
                                : "linear-gradient(145deg, #FFC107, #FFA000)",

                            border: timelineType === "plan"
                                ? "2px solid #0D47A1"
                                : event?.event_date
                                ? "2px solid #1B5E20"
                                : "2px solid #FF8F00",

                            boxShadow: "3px 3px 6px rgba(0, 0, 0, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.2)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            transform: "scale(1.1)",
                        }}
                        >

                        {event?.event_date ? (
                            <DoneIcon sx={{ fontSize: 24, color: "white", filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.5))" }} />
                            ) : (
                            <HourglassEmptyIcon sx={{ fontSize: 24, color: "white", filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.3))" }} />
                        )}

                        </TimelineDot>
                        {index !== events.length - 1 && <TimelineConnector sx={{ bgcolor: "black" }} />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: "12px", px: 2 }}>
                        <Typography variant="h6" component="span">
                        {event?.event_type || "N/A"}
                        </Typography>
                        <Typography>{event?.event_name || '--'}</Typography>
                    </TimelineContent>
                    </TimelineItem>
                ))}
            </Timeline>
            
            {warningClicked && (
                <RitzModal
                    open={warningClicked}
                    onClose={() => setWarningClicked(false)}
                    maxWidth='md'
                    title={"Variation Analysis"}>
                        <Card sx={{ padding: 4, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-start" }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: "100%" }}>
                                <Typography variant="h6" component="div" sx={{ mb: 1, color: 'red' }}>
                                    {delayInfo?.days} days delayed
                                </Typography>
                                <Typography variant="h6" component="div" sx={{ mb: 0.5, textDecoration: 'underline' }}>
                                    Reason:
                                </Typography>
                                <Typography>
                                    {delayInfo?.reason}
                                </Typography>
                            </Box>
                        </Card>
                </RitzModal>
            )}
        </>
    );
}
export default TransportTimeline