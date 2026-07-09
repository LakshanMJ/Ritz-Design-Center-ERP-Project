import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, useTheme, Typography, IconButton, Link, Badge, Grid } from "@mui/material";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { formatAmount } from "@/helpers/Utilities";
import { commercialInvoiceSummaryPageURL, outgoingPaymentDetailPageURL } from "@/helpers/constants/front_end/FinanceUrls";
import NextLink from 'next/link';
import ReorderIcon from '@mui/icons-material/Reorder';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { purchaseOrderClubDetailsPageURL } from "@/helpers/constants/front_end/POUrls";
import CustomerBrandMaterialDetail from "@/views/settings/userdefine_material/MaterialDetail";

const PCLOpenGanttChart = ({ dataList }: any) => {
    const keyHelper = new ReactKeyHelper();
    const theme = useTheme();
    const [chartStartDate, setChartStartDate] = useState<Date | null>(null);
    const [chartEndDate, setChartEndDate] = useState<Date | null>(null);
    const [isOpenMaterialDetailModal, setIsOpenMaterialDetailModal] = useState<any>({});

    const colors = [
        { color: "#B2A5FF", label: "CI Created Date", key: "ci_create_date" }, // Teal Green
        { color: "#F39C12", label: "GRN Complete Date", key: "grn_complete_date" }, // Strong Red
        { color: "#3498DB", label: "PCL Open", key: "pcl_open_date" }, // Vibrant Blue
        { color: "#3E7B27", label: "PCL Settle", key: "pcl_settle_date" }, // Rich Purple
        { color: "#2C3E50", label: "PCL End", key: "pcl_end_date" }, // Dark Slate Blue
        { color: "#D9EAFD", label: "PI Created Date", key: "pi_create_date" }, // Bold Pink
        { color: "#FF0000", label: "Shipment Date", key: "shipment_date" }, // Red
    ];

    const calculatePosition = (date: Date) => {
        if (!chartStartDate || !chartEndDate) return 0;
        const totalDuration = chartEndDate.getTime() - chartStartDate.getTime();
        const position = ((date.getTime() - chartStartDate.getTime()) / totalDuration) * 100;
        return position;
    };

    const calculateBreakdownPosition = (breakdownDate: Date, startDate: Date, endDate: Date) => {
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsedTime = breakdownDate.getTime() - startDate.getTime();
        return (elapsedTime / totalDuration) * 100;
    };

    const calculateWidth = (startDate: Date, endDate: Date) => {
        if (!chartStartDate || !chartEndDate) return 0;
        const totalDuration = chartEndDate.getTime() - chartStartDate.getTime();
        const segmentDuration = endDate.getTime() - startDate.getTime();
        const width = (segmentDuration / totalDuration) * 100;
        return width;
    };

    const generateTimelineLabels = () => {
        if (!chartStartDate || !chartEndDate) return [];
        const labels = [];
        const currentDate = new Date(chartStartDate);
        while (currentDate <= chartEndDate) {
            labels.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return labels;
    };

    const formatDate = (date: Date) => {
        const year = String(date.getFullYear()).slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const formatMonthDay = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}-${day}`;
    };

    const handleReferenceCodeDetailOnClick = (openState: boolean, materialId: any) => {
        setIsOpenMaterialDetailModal({ modalStatus: openState, materialId: materialId });
      }

    const timelineLabels = generateTimelineLabels();
    const facilityStartposition = calculatePosition(new Date(dataList?.pcl_facility_data?.[0]?.date));
    const facilityBarWidth = calculateWidth(new Date(dataList?.pcl_facility_data?.[0]?.date), new Date(dataList?.pcl_facility_data?.[1]?.date));

    const calculateChartDates = useCallback(() => {
        if (!dataList) return;
        const allDates = [
            ...Object.keys(dataList?.shipment_dates || {})
                .map(date => new Date(date))
                .filter(date => !isNaN(date.getTime())),

            ...(dataList?.data?.flatMap((item: { pcl_activities: any[] }) =>
                item.pcl_activities
                    .map(activity => activity.date ? new Date(activity.date) : null)
                    .filter(date => date !== null && !isNaN(date.getTime()))
            ) || []),

            ...(dataList?.pcl_facility_data
                ?.map((facility: { date: any }) => facility.date ? new Date(facility.date) : null)
                .filter((date: { getTime: () => number; }) => date !== null && !isNaN(date.getTime())) || []
            )
        ];
        if (allDates.length > 0) {
            const firstDate = new Date(Math.min(...allDates.map(date => date.getTime())));
            const lastDate = new Date(Math.max(...allDates.map(date => date.getTime())));

            const adjustedFirstDate = new Date(firstDate);
            adjustedFirstDate.setDate(adjustedFirstDate.getDate() - 1);

            const adjustedLastDate = new Date(lastDate);
            adjustedLastDate.setDate(adjustedLastDate.getDate() + 1);

            setChartStartDate(adjustedFirstDate);
            setChartEndDate(adjustedLastDate);
        } else {
            setChartStartDate(null);
            setChartEndDate(null);
        }
    }, [dataList]);

    const renderShipmentDates = () => {
        return (Object.entries(dataList?.shipment_dates || {}) as any[]).map(([date, shipments]) => {
            const shipmentDate = new Date(date);
            const shipmentPosition = calculatePosition(shipmentDate);
            return (
                <Box
                    key={`${keyHelper.getNextKeyValue()}`}
                    sx={{
                        position: "absolute",
                        left: `${shipmentPosition}%`,
                        width: "15px",
                        height: "100%",
                        border: "1px solid #000",
                        backgroundColor: "#FF0000",
                        transform: "translateX(-50%)",
                    }}
                >
                    <Tooltip title={
                        <Box>
                            {shipments.map((shipment: any) => (
                                <Box key={`${keyHelper.getNextKeyValue()}`} sx={{ mb: 1 }}>
                                    <Typography sx={{ fontWeight: "bold", textAlign: 'center' }}>
                                        {shipment?.display_number}
                                    </Typography>
                                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                                        <Typography sx={{ fontWeight: 'bold' }}>{formatMonthDay(shipmentDate)}</Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    } arrow>
                        <Box sx={{ width: "100%", height: "100%", cursor: "pointer" }} />
                    </Tooltip>
                </Box>
            );
        });
    };
    const renderPclEndToSettleBox = (filteredAndSortedData: any[]) => {
        const pclEndDate = filteredAndSortedData.find((item: any) => item.activity === 'PCL End')?.date;
        const pclSettleDate = filteredAndSortedData.find((item: any) => item.activity === 'PCL Settle')?.date;

        if (pclEndDate && pclSettleDate && new Date(pclSettleDate) > new Date(pclEndDate)) {
            const startDate = new Date(pclEndDate);
            const endDate = new Date(pclSettleDate);
            const pclEndPosition = calculatePosition(startDate);
            const width = calculateWidth(startDate, endDate);
            const daysBetween = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * 4;

            return (
                <Box
                    key={`${keyHelper.getNextKeyValue()}`}
                    sx={{
                        position: "absolute",
                        left: `${pclEndPosition}%`,
                        width: `${width}%`,
                        height: "100%",
                        opacity: 0.5,
                        display: "grid",
                        gridTemplateColumns: `repeat(${daysBetween}, 1fr)`,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                    }}
                >
                    {Array.from({ length: daysBetween }).map((_, index) => (
                        <ReorderIcon
                            key={index}
                            sx={{
                                width: "100%",
                                height: "100%",
                                color: "red",
                            }}
                        />
                    ))}
                </Box>
            );
        }
        return null;
    };

    useEffect(() => {
        calculateChartDates();
    }, [calculateChartDates]);

    if (!chartStartDate || !chartEndDate) return null;


    return (
        <>
            {isOpenMaterialDetailModal.modalStatus &&
                <CustomerBrandMaterialDetail
                    customerBrandMaterialReferenceCodeId={isOpenMaterialDetailModal?.materialId}
                    modalOpen={isOpenMaterialDetailModal.modalStatus}
                    setModalOpen={() => { setIsOpenMaterialDetailModal({ modalStatus: false, materialId: null }) }}
                />
            }
            <Box sx={{ mb: 2 }}>
                <Grid container spacing={2}>
                    {colors.map((colorItem, index) => (
                        <Grid item key={index} sx={{ display: "flex", alignItems: "center" }}>
                            <Box
                                sx={{
                                    width: "20px",
                                    height: "20px",
                                    backgroundColor: colorItem.color,
                                    marginRight: "8px",
                                    borderRadius: "4px",
                                }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                {colorItem.label}
                            </Typography>
                        </Grid>
                    ))}
                </Grid>
            </Box>
            <Box sx={{ overflowY: "auto" }}>
                <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
                    <Table  aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 3,
                                        backgroundColor: "white",
                                        border: `1px solid ${theme.palette.grey[200]}`,
                                        textAlign: "center",
                                    }}
                                >
                                    Description
                                </TableCell>
                                <TableCell colSpan={timelineLabels.length} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                        {timelineLabels?.map((label, index) => (
                                            <Box
                                                key={`${keyHelper.getNextKeyValue()}`}
                                                sx={{
                                                    textAlign: "center",
                                                    width: "100px",
                                                }}
                                            >
                                                {formatDate(label)}
                                            </Box>
                                        ))}
                                    </Box>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{
                                    position: "sticky",
                                    left: 0,
                                    zIndex: 3,
                                    backgroundColor: "white",
                                    border: `1px solid ${theme.palette.grey[200]}`,
                                    textAlign: "left",

                                }} >  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Typography sx={{fontWeight:'bold', color: "primary.main"}}>Shipments</Typography> <LocalShippingIcon /><ArrowForwardIcon />
                            </Box></TableCell>
                                <TableCell colSpan={timelineLabels?.length} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                    <Box sx={{ position: "relative", height: "40px" }}>
                                        {(Object.entries(dataList?.shipment_dates || {}) as any[]).map(([date, shipments]) => {
                                            const shipmentDate = new Date(date);
                                            const shipmentPosition = calculatePosition(shipmentDate);
                                            return (
                                                <Box
                                                    key={`${keyHelper.getNextKeyValue()}`}
                                                    sx={{
                                                        position: "absolute",
                                                        left: `${shipmentPosition}%`,
                                                        transform: "translateX(-50%)",
                                                        textAlign: "center",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    <Tooltip title={
                                                        <Box>
                                                            {shipments.map((shipment: any) => (
                                                                <Box key={`${keyHelper.getNextKeyValue()}`} sx={{ mb: 1 }}>
                                                                    <Typography sx={{ fontWeight: "bold", textAlign: 'center' }}>
                                                                        {shipment?.display_number}
                                                                    </Typography>
                                                                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                                                                        <Typography sx={{ fontWeight: 'bold' }}>{formatAmount(shipment?.amount?.amount)} USD</Typography>
                                                                        <Typography sx={{ fontWeight: 'bold' }}>({formatMonthDay(shipmentDate)})</Typography>
                                                                        <Typography sx={{ fontWeight: 'bold' }}>-{shipment?.purchase_order_display_number}</Typography>
                                                                    </Box>
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    } arrow>
                                                        <IconButton sx={{ position: 'relative' }}>
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    right: 0,
                                                                    backgroundColor: 'green',
                                                                    color: 'white',
                                                                    fontSize: '12px',
                                                                    fontWeight: 'bold',
                                                                    borderRadius: '50%',
                                                                    width: '20px',
                                                                    height: '20px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transform: 'translate(50%, -50%)',
                                                                }}
                                                            >
                                                                {shipments?.length || 0}
                                                            </Box>
                                                            <LocalShippingIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow sx={{ height: 80 }}>
                                <TableCell sx={{ position: "sticky", left: 0, zIndex: 3, backgroundColor: "white", border: `1px solid ${theme.palette.grey[200]}`, textAlign: "left"}}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <Typography sx={{fontWeight:'bold', color: "primary.main"}}>Facility Breakdown</Typography> <AssuredWorkloadIcon/> <ArrowForwardIcon />
                                    </Box>
                                </TableCell>
                                <TableCell colSpan={timelineLabels.length} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: "left" }}>
                                    <Box sx={{ position: "relative", height: "20px", backgroundColor: "#f0f0f0" }}>
                                        <Box key={`${keyHelper.getNextKeyValue()}`} sx={{ position: "absolute", left: `${facilityStartposition}%`, width: `${facilityBarWidth}%`, height: "100%", backgroundColor: "primary.main" }}>
                                            {dataList?.pcl_facility_data?.map((itemBreakdown: any, breakdownIdx: number) => {
                                                const breakdownDate = new Date(itemBreakdown.date);
                                                const breakdownPosition = calculateBreakdownPosition(
                                                    breakdownDate,
                                                    new Date(dataList?.pcl_facility_data?.[0]?.date),
                                                    new Date(dataList?.pcl_facility_data?.[1]?.date)
                                                );
                                                const formattedDate = breakdownDate?.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
                                                return (
                                                    <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                position: "absolute",
                                                                top: "-20px",
                                                                left: `${breakdownPosition}%`,
                                                                transform: "translateX(-50%)",
                                                                padding: "2px 4px",
                                                                mb: 6,
                                                                borderRadius: "1px",
                                                                zIndex: 2,
                                                                whiteSpace: "nowrap",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                            }}
                                                        >
                                                            <Box component="span" sx={{ fontWeight: "bold" }}>{itemBreakdown?.activity}</Box>{" "} ({formattedDate})
                                                        </Typography>
                                                        <Box
                                                            sx={{
                                                                position: "absolute",
                                                                left: `${breakdownPosition}%`,
                                                                width: "20px",
                                                                height: "100%",
                                                                backgroundColor: "#F5ECD5",
                                                                transform: "translateX(-50%)",
                                                                border: "2px solid #000",
                                                            }}
                                                        >
                                                            <Tooltip
                                                                title={
                                                                    <Box>
                                                                        <Typography sx={{ fontWeight: "bold", textAlign: 'center' }}>
                                                                            {itemBreakdown.activity} ({formattedDate})
                                                                        </Typography>
                                                                    </Box>
                                                                }
                                                                arrow
                                                            >
                                                                <Box sx={{ width: "100%", height: "100%", cursor: "pointer" }} />
                                                            </Tooltip>

                                                        </Box>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </Box>
                                        {renderShipmentDates()}
                                    </Box>
                                </TableCell>
                            </TableRow>
                            {dataList?.data?.map((item: any, idx: number) => {
                                const hasData = item?.pcl_activities && item?.pcl_activities.length > 0;
                                const filteredAndSortedData = hasData ? item?.pcl_activities
                                    .filter((entry: any) => entry.date !== null) // need to Remove null dates
                                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    : [];
                                const sameDatesWithKeys = filteredAndSortedData.reduce((newDate: any, currentValue: any) => {
                                    const date = currentValue.date;
                                    if (!newDate[date]) {
                                        newDate[date] = [];
                                    }
                                    newDate[date].push({ activity: currentValue?.activity, key: currentValue?.key });
                                    return newDate;
                                }, {});
                                const startDate = hasData ? new Date(filteredAndSortedData[0]?.date) : null;
                                const endDate = hasData ? new Date(filteredAndSortedData[filteredAndSortedData?.length - 1]?.date) : null;
                                const position = hasData ? calculatePosition(startDate) : null;
                                const width = hasData ? calculateWidth(startDate, endDate) : null;

                                return (
                                    <TableRow sx={{ height: 80 }} key={`${keyHelper.getNextKeyValue()}`}>
                                        <TableCell
                                            sx={{
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 3,
                                                backgroundColor: "white",
                                                border: `1px solid ${theme.palette.grey[200]}`,
                                                textAlign: "left",

                                            }}
                                        >
                                            <Link component={NextLink} href={outgoingPaymentDetailPageURL(item?.id)}><Typography sx={{fontWeight:'bold'}}>{item?.display_number}</Typography></Link>
                                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
                                                {Object.entries(item?.invoice_spo_data as Record<string, any[]>).map(([date, invoices], index) => (
                                                    <Box key={index}>
                                                        {/* Display Date */}
                                                        <Typography variant="h6" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", mb: 1 }}>
                                                            {date}
                                                        </Typography>
                                                        {invoices.map((invoice: any, invoiceIndex: number) => (
                                                            <Box key={invoiceIndex} sx={{mt:1}}>
                                                                {/* Display Invoice Number */}
                                                                <Link component={NextLink} href={commercialInvoiceSummaryPageURL(invoice?.id)}>
                                                                <Typography variant="h6" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", mb: 1 }}>
                                                                    {invoice?.display_number} - {invoice?.type === 'advance' && ("Adavace Payment")}
                                                                </Typography>
                                                                </Link>
                                                                {/* Display Materials */}
                                                                {invoice?.materials?.map((material: any, materialIndex: number) => (
                                                                    <Box key={materialIndex} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                        <FiberManualRecordIcon sx={{ fontSize: 14, color: "grey.500" }} />
                                                                        <Typography variant="body1" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                                            <Link href={purchaseOrderClubDetailsPageURL(invoice?.club_id)} underline="hover">
                                                                                {invoice?.club_display_number}
                                                                            </Link>
                                                                            -
                                                                            <Link sx={{ cursor: "pointer" }}  component="button"  onClick={()=>{handleReferenceCodeDetailOnClick(true, material.attributes.customer_brand_material_id)}} underline="hover">
                                                                                {material.attributes?.ritz_customer_brand_reference_code}
                                                                            </Link>
                                                                        </Typography>
                                                                    </Box>
                                                                ))}
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell
                                            colSpan={timelineLabels.length}
                                            sx={{
                                                border: `1px solid ${theme.palette.grey[200]}`,
                                                textAlign: "left",
                                            }}
                                        >
                                            <Box sx={{ position: "relative", height: "20px", backgroundColor: "#f0f0f0" }}>
                                                {filteredAndSortedData?.length > 0 && (
                                                    <Box
                                                        key={`${keyHelper.getNextKeyValue()}`}
                                                        sx={{
                                                            position: "absolute",
                                                            left: `${position}%`,
                                                            width: `${width}%`,
                                                            height: "100%",
                                                            backgroundColor: "#36AE7C",
                                                        }}
                                                    >
                                                        {filteredAndSortedData?.map((itemBreakdown: any, breakdownIdx: number) => {
                                                            const breakdownDate = new Date(itemBreakdown.date);
                                                            const breakdownPosition = calculateBreakdownPosition(breakdownDate, startDate, endDate);
                                                            const formattedDate = breakdownDate?.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
                                                            return (
                                                                <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                                                                    <Box
                                                                        sx={{
                                                                            position: "absolute",
                                                                            left: `${breakdownPosition}%`,
                                                                            width: "20px",
                                                                            height: "100%",
                                                                            transform: "translateX(-50%)",
                                                                            border: "2px solid #000",
                                                                        }}
                                                                    >
                                                                        <Tooltip
                                                                            title={
                                                                                <Box>
                                                                                    {sameDatesWithKeys[itemBreakdown?.date]?.map((activity: any, index: number) => (
                                                                                        <Box key={`${keyHelper.getNextKeyValue()}`} sx={{ mb: 1 }}>
                                                                                            <Typography sx={{ fontWeight: "bold", textAlign: 'center' }}>
                                                                                                {activity?.activity} ({formattedDate})
                                                                                            </Typography>
                                                                                        </Box>
                                                                                    ))}
                                                                                </Box>
                                                                            }
                                                                            arrow
                                                                        >
                                                                            <Box sx={{ display: "flex", width: "100%", height: "100%", position: "relative" }}>
                                                                                {sameDatesWithKeys[itemBreakdown?.date]?.map((activity: any, index: number) => {
                                                                                    const activityColor = colors.find(colorItem => colorItem.key === activity.key)?.color || "#FF9100";
                                                                                    const activityWidth = 100 / sameDatesWithKeys[itemBreakdown?.date].length;
                                                                                    return (

                                                                                        <Box
                                                                                            key={`${keyHelper.getNextKeyValue()}`}
                                                                                            sx={{
                                                                                                position: "absolute",
                                                                                                left: `${index * activityWidth}%`,
                                                                                                width: `${activityWidth}%`,
                                                                                                height: "100%",
                                                                                                backgroundColor: activityColor,
                                                                                                cursor: "pointer"
                                                                                            }}
                                                                                        />

                                                                                    );
                                                                                })}
                                                                            </Box>
                                                                        </Tooltip>
                                                                    </Box>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </Box>
                                                )}
                                                {renderPclEndToSettleBox(filteredAndSortedData)}
                                                {renderShipmentDates()}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </>
    );
};

export default PCLOpenGanttChart;