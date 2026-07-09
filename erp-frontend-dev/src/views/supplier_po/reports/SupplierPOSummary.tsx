import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Alert, Box, Card, CardHeader, Grid, IconButton, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, darken, useTheme } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { getClubSupplierPODetailsURL, grnSummaryBreakdownUsingDeliveryDateIdURL, grnSummaryBreakdownUsingDeliveryIdURL, grnSummaryBreakdownUsingInvoiceIdURL, grnSummaryBreakdownUsingPackListIdURL, grnSummaryBreakdownUsingPerfomaInvoiceIdURL, grnSummaryBreakdownUsingSpoIdURL } from "@/helpers/constants/rest_urls/SupplierPoUrls";
import RitzMultipleFileUploader from "@/components/Ritz/RitzMultipleFileUploader";
import { LISTVIEW } from "@/helpers/constants/FileUpload";
import { purchaseOrderDetailPageURL } from "@/helpers/constants/FrontEndUrls";
import DoughnutChart from "@/components/Charts/DougnutChart";
import ActualDeliverySummary from "./ActualDeliverySummary";
import InspectionSummary from "./InspectionSummary";
import { TabContext } from "@mui/lab";
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import router, { useRouter } from "next/router";
import GRNSummary from "./GrnSummary";
import ShadeSummary from "./ShadeSummary";
import CISummary from "./CISummary";
import GRNIssues from "./GRNIssues";

const SupplierPOSummary = ({ spoId, reportId, reportType, selectedId, isPOClub }: any) => {
    const [summaryTabs, setSummaryTabs] = useState(['GRN Summary', 'Delivery Summary', 'Inspection Summary', 'Shade Summary', 'GRN Issues']);
    const [activeTab, setActiveTab] = useState('1');
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    
    const handleChangeTabs = (event: string) => {
        const url = {
            pathname: router.pathname,
            query: { ...router.query, tab: event }
        }
        router.replace(url, undefined, { shallow: true });
    };

    useEffect(() => {
        const { tab } = router.query;
        if (tab) {
            setActiveTab(tab.toString());
        }
    }, [router]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                <TabContext value={activeTab}>
                    <RitzTabs
                        tabs={summaryTabs}
                        activeTab={activeTab}
                        emitChange={handleChangeTabs}
                    />
                    <RitzTabPanel value='1'>
                        <Box>
                            <GRNSummary spoId={spoId} reportId={reportId} reportType={reportType} />
                        </Box>
                    </RitzTabPanel>
                    <RitzTabPanel value='2'>
                        <Box>
                            <ActualDeliverySummary spoId={spoId} reportId={reportId} reportType={reportType} />
                        </Box>
                    </RitzTabPanel>
                    <RitzTabPanel value='3'>
                        <Box>
                            <InspectionSummary spoId={spoId} reportId={reportId} reportType={reportType} />
                        </Box>
                    </RitzTabPanel>
                    <RitzTabPanel value='4'>
                        <Box>
                            <ShadeSummary spoId={spoId} reportId={reportId} reportType={reportType} />
                        </Box>
                    </RitzTabPanel>
                    <RitzTabPanel value='5'>
                        <Box>
                            <GRNIssues spoId={spoId} selectedId={selectedId} isPOClub={isPOClub} />
                        </Box>
                    </RitzTabPanel>
                </TabContext>
            </>
            }
        </>
    );
};

export default SupplierPOSummary;
