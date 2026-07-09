import React, { useCallback, useEffect, useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import { Box, Link, Typography, TableContainer, Paper, Table, TableHead, TableRow, TableCell, useTheme, TableBody, Tooltip, Grid, IconButton } from '@mui/material';
import { formatAmount } from '@/helpers/Utilities';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import RitzToolTip from '@/components/Ritz/RitzTooltip';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';

const PCLClubBomDetails = ({ dataSet }: any) => {
    const theme = useTheme()
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false);
    const [chartStartDate, setChartStartDate] = useState<Date | null>(null);
    const [chartEndDate, setChartEndDate] = useState<Date | null>(null);
    const [showMaterialGanttChart, setShowMaterialGanttChart] = useState(false);

    const colors = [
        { color: "#B2A5FF", label: "CI Created Date", key: "ci_create_date" }, // Teal Green
        { color: "#F39C12", label: "GRN Complete Date", key: "grn_complete_date" }, // Strong Red
        { color: "#3498DB", label: "PCL Open", key: "pcl_open_date" }, // Vibrant Blue
        { color: "#3E7B27", label: "PCL Settle", key: "pcl_settle_date" }, // Rich Purple
        { color: "#2C3E50", label: "PCL End", key: "pcl_end_date" }, // Dark Slate Blue
        { color: "#D9EAFD", label: "PI Created Date", key: "pi_create_date" }, // Bold Pink
        { color: "#FF0000", label: "Shipment Date", key: "shipment_date" }, // Red
    ];

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

    const timelineLabels = generateTimelineLabels();

    const calculateChartDates = useCallback(() => {
        
        if (!dataSet) return;
        const allDates: Date[] = [];
        dataSet.forEach((category: { material_data: any[]; }) => {
            category.material_data.forEach(material => {
                material.supplier_data.forEach((supplier: { gantt_chart: { pcl_activities: any[]; shipment_dates: {}; }; }) => {
                    // pcl_activities dates
                    if (supplier.gantt_chart?.pcl_activities) {
                        allDates.push(
                            ...supplier.gantt_chart.pcl_activities
                                .map(activity => activity.date ? new Date(activity.date) : null)
                                .filter(date => date !== null && !isNaN(date.getTime()))
                        );
                    }
                    // shipment_dates
                    if (supplier.gantt_chart?.shipment_dates) {
                        allDates.push(
                            ...Object.keys(supplier.gantt_chart.shipment_dates)
                                .map(date => new Date(date))
                                .filter(date => !isNaN(date.getTime()))
                        );
                    }
                });
            });
        });

        if (allDates.length > 0) {
            const firstDate = new Date(Math.min(...allDates.map(date => date.getTime())));
            const lastDate = new Date(Math.max(...allDates.map(date => date.getTime())));

            setChartStartDate(new Date(firstDate.setDate(firstDate.getDate() - 1)));
            setChartEndDate(new Date(lastDate.setDate(lastDate.getDate() + 1)));
        } else {
            setChartStartDate(null);
            setChartEndDate(null);
        }
    }, [dataSet]);

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

    const renderShipmentDates = (shipmentDates: Record<string, any[]>) => {
        return (Object.entries(shipmentDates || {}) as any[]).map(([date, shipments]) => {
            const shipmentDate = new Date(date);
            const shipmentPosition = calculatePosition(shipmentDate);
            const formattedDate = shipmentDate.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });

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
                    <Tooltip
                        title={
                            <Box>
                                {shipments.map((shipment: any) => (
                                    <Box key={shipment.id} sx={{ mb: 1 }}>
                                        <Typography sx={{ fontWeight: "bold", textAlign: 'center' }}>
                                            {shipment?.display_number}
                                        </Typography>
                                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                                            <Typography sx={{ fontWeight: 'bold' }}>{formattedDate}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        }
                        arrow
                    >
                        <Box sx={{ width: "100%", height: "100%", cursor: "pointer" }} />
                    </Tooltip>
                </Box>
            );
        });
    };

    useEffect(() => {
        calculateChartDates();
    }, [calculateChartDates]);

    return (
        <>

            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box sx={{ mb: 1 }}>
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
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Tooltip title={showMaterialGanttChart ? "Show Less" : "Show More"}>
                            <IconButton
                                onClick={() => setShowMaterialGanttChart(!showMaterialGanttChart)}
                                sx={{ padding: '4px' }}
                            >
                                {showMaterialGanttChart ? <KeyboardDoubleArrowLeftIcon /> : <KeyboardDoubleArrowRightIcon />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Box>
                        <TableContainer component={Paper} sx={{ maxHeight: "90vh", overflow: "auto" }}>
                            <Table stickyHeader >
                                <TableHead>
                                    <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                        <TableCell
                                            sx={{
                                                border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                textAlign: 'left',
                                                position: 'sticky',
                                                left: 0,
                                                backgroundColor: (theme) => theme.palette.background.paper,
                                                zIndex: 1000,
                                                width: '20%',
                                            }}
                                        >
                                            Material
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Supplier</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>SPO No</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Order Quantity</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Price</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Required Quantity</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Total Order Quantity</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Total Price</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Receiving Type</TableCell>
                                        {showMaterialGanttChart && (
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
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {dataSet?.map((materialCategory: any, materialCategoryIndex: any) => (
                                        <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                                            <TableRow key="header-row">
                                                <TableCell
                                                    colSpan={11}
                                                    sx={{
                                                        background: (theme) => theme.palette.grey[100],
                                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                        position: 'sticky',
                                                        top: 0,
                                                        zIndex: 1,
                                                    }}
                                                >
                                                    <Typography sx={{ mr: 1 }} fontWeight={'bold'} fontSize={'1.3rem'}>
                                                        {/* Category Name */}
                                                        {materialCategory?.category === "fabric"
                                                            ? "Fabric"
                                                            : materialCategory.category === "sewing_trim"
                                                                ? "Sewing Trim"
                                                                : materialCategory.category === "packaging_trim"
                                                                    ? "Packaging"
                                                                    : '#'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                            {materialCategory.material_data?.map((material: any, materialIndex: any) => (
                                                material?.supplier_data?.map((spo: any, spoIndex: any) => (
                                                    <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                                                        <TableRow>
                                                            {spoIndex === 0 && (
                                                                <TableCell
                                                                    rowSpan={material?.supplier_data?.length}
                                                                    sx={{
                                                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                        width: '20%',
                                                                        textAlign: 'left',
                                                                        p: 1,
                                                                        position: 'sticky',
                                                                        left: 0,
                                                                        backgroundColor: (theme) => theme.palette.background.paper,
                                                                        zIndex: 2,
                                                                    }}
                                                                >
                                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                        <Typography sx={{ mr: 1 }}>
                                                                            {material?.attributes?.ritz_customer_brand_reference_code}
                                                                        </Typography>
                                                                        <RitzToolTip materialHeaders={material?.headers} materialDetails={material?.attributes} />
                                                                    </Box>
                                                                </TableCell>
                                                            )}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', textAlign: 'left' }}>{spo?.supplier_name}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '5%', textAlign: 'left' }}>
                                                                <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={spo?.attachment_file_path}>{spo?.supplier_po}</Link>
                                                            </TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '5%', textAlign: 'left' }}>{spo?.order_quantity?.quantity} {spo?.order_quantity?.quantity_units_display}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', extAlign: 'left' }}>{formatAmount(spo?.price?.amount)} {spo?.price?.amount_currency}</TableCell>
                                                            {spoIndex === 0 && (
                                                                <>
                                                                    <TableCell rowSpan={material?.supplier_data?.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', textAlign: 'center' }}>{material?.total_required_quantity?.quantity} {material?.total_required_quantity?.quantity_units_display}</TableCell>
                                                                    <TableCell rowSpan={material?.supplier_data?.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', textAlign: 'center' }}>{material?.total_order_quantity?.quantity} {material?.total_order_quantity?.quantity_units_display}</TableCell>
                                                                    <TableCell rowSpan={material?.supplier_data?.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', textAlign: 'center' }}>{material?.total_price?.amount} {material?.total_price?.amount_currency}</TableCell>
                                                                </>
                                                            )}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', textAlign: 'left' }}>{spo?.receiving_type}</TableCell>
                                                            {showMaterialGanttChart && (
                                                                <TableCell colSpan={timelineLabels.length} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: '10%', textAlign: "left" }}>
                                                                    <Box sx={{ position: "relative", height: "20px", backgroundColor: "#f0f0f0" }}>
                                                                        {(() => {
                                                                            const filteredAndSortedData = spo.gantt_chart?.pcl_activities
                                                                                .filter((entry: { date: string; }) => entry.date !== null && entry.date !== "")
                                                                                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

                                                                            if (filteredAndSortedData.length === 0) return null;
                                                                            const startDate = new Date(filteredAndSortedData[0]?.date);
                                                                            const endDate = new Date(filteredAndSortedData[filteredAndSortedData.length - 1]?.date);
                                                                            const position = calculatePosition(startDate);
                                                                            const width = calculateWidth(startDate, endDate);

                                                                            const groupedByDate = filteredAndSortedData.reduce((acc: Record<string, { activity: string; key: string }[]>, item: any) => {
                                                                                if (!acc[item.date]) {
                                                                                    acc[item.date] = [];
                                                                                }
                                                                                acc[item.date].push({ activity: item.activity, key: item.key });
                                                                                return acc;
                                                                            }, {});

                                                                            return (
                                                                                <Box sx={{ position: "absolute", left: `${position}%`, width: `${width}%`, height: "100%", backgroundColor: "#36AE7C" }}>
                                                                                    {Object.entries(groupedByDate).map(([date, activities], index) => {
                                                                                        const breakdownDate = new Date(date);
                                                                                        const breakdownPosition = calculateBreakdownPosition(breakdownDate, startDate, endDate);
                                                                                        const formattedDate = breakdownDate.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });

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
                                                                                                                {(activities as any[]).map((activity: any, index: any) => (
                                                                                                                    <Box key={index} sx={{ mb: 1 }}>
                                                                                                                        <Typography sx={{ fontWeight: "bold", textAlign: "center" }}>
                                                                                                                            {activity.activity} ({formattedDate})
                                                                                                                        </Typography>
                                                                                                                    </Box>
                                                                                                                ))}
                                                                                                            </Box>
                                                                                                        }
                                                                                                        arrow
                                                                                                    >
                                                                                                        <Box sx={{ width: "100%", height: "100%" }}>
                                                                                                            {(activities as { activity: string; key: string }[]).length > 0 &&
                                                                                                                (activities as { activity: string; key: string }[]).map((activity, index) => {
                                                                                                                    const activityColor = colors.find((colorItem) => colorItem.key === activity.key)?.color || "#FF9100";
                                                                                                                    const activityWidth = 100 / (activities as { activity: string; key: string }[]).length;

                                                                                                                    return (
                                                                                                                        <Box
                                                                                                                            key={index}
                                                                                                                            sx={{
                                                                                                                                position: "absolute",
                                                                                                                                left: `${index * activityWidth}%`,
                                                                                                                                width: `${activityWidth}%`,
                                                                                                                                height: "100%",
                                                                                                                                backgroundColor: activityColor,
                                                                                                                                cursor: "pointer",
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
                                                                            );
                                                                        })()}
                                                                        {renderShipmentDates(spo.gantt_chart?.shipment_dates)}
                                                                    </Box>
                                                                </TableCell>
                                                            )}

                                                        </TableRow>
                                                    </React.Fragment>
                                                ))
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </>
            )}
        </>
    );
};

export default PCLClubBomDetails;