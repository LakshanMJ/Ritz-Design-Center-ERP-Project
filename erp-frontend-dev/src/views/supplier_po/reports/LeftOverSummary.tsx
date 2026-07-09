import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Box, Divider, IconButton, InputLabel, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import DefaultLoader from "@/components/DefaultLoader";
import RitzModal from "@/components/Ritz/RitzModal";
import { grnSummaryReportURL } from "@/helpers/constants/front_end/GrnUrls";

const LeftOverSummary = ({ dataList, spoId, selectedId, isPOClub }: any) => {

    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const [leftOverDetails, setLeftOverDetails] = useState<any>({});
    const [selectedRowData, setSelectedRowData] = useState<any>({});
    const [showReceivingModal, setShowReceivingModal] = useState(false);
    const handleReceivingModalOpen = (shadeData: any) => {
        setShowReceivingModal(true)
        setSelectedRowData(shadeData)

    }
    const handleViewGRNSummary = (spoId: any, reportId: any, reportType: any) => {
        const url = grnSummaryReportURL(spoId, reportId, reportType, selectedId, isPOClub);
        window.open(url, '_blank');
     };

    useEffect(() => {
        if (dataList) {
            setLeftOverDetails(dataList)
        }
    }, [dataList]);

    return (
        <>
            {showReceivingModal &&
                <RitzModal maxWidth='md' open={showReceivingModal} title={'Receiving Details'} onClose={() => setShowReceivingModal(false)}>
                    <Table >
                        <TableHead>
                            <TableRow sx={{ background: theme.palette.grey[100] }}>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>PackList</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Shade</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Width</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Roll</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Quantity</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {selectedRowData?.shades?.map((shade: any, shadeIndex: any) => (
                                shade?.widths?.map((width: any, widthIndex: any) => (
                                    width?.rolls?.map((roll: any, rollIndex: any) => {
                                        const totalRowsForPackList = selectedRowData?.shades?.reduce((shadeAcc: number, shade: any) => {
                                            return shadeAcc + shade?.widths?.reduce((widthAcc: number, width: any) => {
                                                return widthAcc + width?.rolls?.length;}, 0)}, 0);
                                        const totalRowsForShade = shade?.widths?.reduce((acc: number, cur: any) => acc + cur.rolls.length, 0);
                                        const totalRowsForWidth = width?.rolls?.length;
                                        return (
                                            <TableRow key={`${shade.id}-${width.id}-${roll.id}`}>
                                                { shadeIndex == 0 && widthIndex === 0 && rollIndex === 0 && (
                                                    <TableCell rowSpan={totalRowsForPackList} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                        <Link
                                                            component="button"
                                                            onClick={() => { handleViewGRNSummary(spoId, selectedRowData?.pack_list_id, 'packList') }
                                                            }
                                                            sx={{ mr: 1 }}
                                                        >
                                                           {selectedRowData.pack_list_name}
                                                        </Link>
                                                    </TableCell>
                                                )}
                                                {widthIndex == 0 && rollIndex === 0 && (
                                                    <TableCell rowSpan={totalRowsForShade} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                        {shade.shade}
                                                    </TableCell>
                                                )}
                                                {rollIndex === 0 && (
                                                    <TableCell rowSpan={totalRowsForWidth} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                        {width.width}
                                                    </TableCell>
                                                )}
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{roll?.pack_number}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{roll?.quantity} {roll?.quantity_units}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                ))
                            ))}
                        </TableBody>
                    </Table>
                </RitzModal>

            }
            {isLoading ? <DefaultLoader /> : <>
                <Table >
                    <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Replacement</TableCell>
                            <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Receiving</TableCell>
                        </TableRow>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Pack List</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Total Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>GRN No</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>PackList</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Total Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>View</TableCell>

                        </TableRow>

                    </TableHead>
                    <TableBody>
                        {leftOverDetails.replacement_details?.length === 0 ? (
                            <>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                        <Link
                                            component="button"
                                            onClick={() => { handleViewGRNSummary(spoId, leftOverDetails?.pack_list_id, 'packList') }
                                            }
                                            sx={{ mr: 1 }}
                                        >
                                           {leftOverDetails?.pack_list_name}
                                        </Link>
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{leftOverDetails?.total_quantity.quantity}</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>--</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>--</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>--</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>--</TableCell>
                                </TableRow>
                            </>
                        ) : (
                            <>
                                {leftOverDetails.replacement_details?.map((replacement: any, replacementIndex: any) => (
                                    <TableRow key={replacement.id}>
                                        {replacementIndex === 0 && (
                                            <>
                                                <TableCell rowSpan={leftOverDetails.replacement_details.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{leftOverDetails?.pack_list_name}</TableCell>
                                                <TableCell rowSpan={leftOverDetails.replacement_details.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{leftOverDetails?.total_quantity.quantity} {leftOverDetails?.total_quantity.quantity_units_display}</TableCell>
                                            </>
                                        )}
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{replacement?.grn_number}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                            <Link
                                                component="button"
                                                onClick={() => { handleViewGRNSummary(spoId, replacement?.pack_list_id, 'packList') }
                                                }
                                                sx={{ mr: 1 }}
                                            >
                                                {replacement?.pack_list_name}
                                            </Link>
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{replacement?.total_quantity?.quantity} {replacement?.total_quantity?.quantity_units_display}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>
                                            <Tooltip title="Receiving Details" arrow>
                                                <IconButton aria-label="aspect-ratio" onClick={() => handleReceivingModalOpen(replacement)} sx={{ p: 0 }}>
                                                    <AspectRatioIcon color="primary" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        )}
                    </TableBody>
                </Table>
            </>}
        </>
    );
};

export default LeftOverSummary;
