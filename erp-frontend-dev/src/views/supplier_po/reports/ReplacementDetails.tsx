import React, { useEffect, useState } from "react"
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography, useTheme } from '@mui/material';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { createdGrnDetailsPageURL } from "@/helpers/constants/front_end/GrnUrls";
import InfoIcon from '@mui/icons-material/Info';


const ReplacementDetails = ({ dataList, materialData }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const [replacementData, setReplacementData] = useState<any>(dataList);

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                <Table >
                    <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Delivery</TableCell>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Fabric Description</TableCell>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Color</TableCell>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Pack List</TableCell>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Batch#</TableCell>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Reject Roll#</TableCell>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Reject Quantity</TableCell>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Replacement Quantity</TableCell>
                            <TableCell colSpan={3} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Replacement Commitment</TableCell>
                        </TableRow>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Delivery</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Date</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Quantity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {replacementData.batches?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} sx={{ textAlign: 'center', border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                    No Available Details
                                </TableCell>
                            </TableRow>
                        ) : (
                            replacementData.batches?.map((batch: any, batchIndex: number) => (
                                batch.rolls?.map((roll: any, rollIndex: number) => {
                                    const totalRows = replacementData.batches.reduce((acc: number, batch: any) => {
                                        return acc + batch.rolls.length;
                                    }, 0);
    
                                    return (
                                        <TableRow key={`${batchIndex}-${rollIndex}`}>
                                            {batchIndex === 0 && rollIndex === 0 && (
                                                <>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                        {materialData.delivery_date}
                                                    </TableCell>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                                                            {materialData.ritz_code}
                                                            <Tooltip
                                                                arrow
                                                                title={
                                                                    <Box>
                                                                        {materialData.material?.headers?.map((header: any, headerIndex: number) => (
                                                                            <Typography key={headerIndex}>{header.label} : {materialData.material?.attributes?.[header.value]}</Typography>
                                                                        ))}
                                                                    </Box>
                                                                }
                                                            >
                                                                <InfoIcon fontSize="small" sx={{ opacity: '60%' }} />
                                                            </Tooltip>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                        {materialData.color}
                                                    </TableCell>
                                                </>
                                            )}
                                            {batchIndex === 0 && rollIndex === 0 && (
                                                <>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                        <Link sx={{ cursor: 'pointer' }} href={createdGrnDetailsPageURL(replacementData.grn_id)} target="_blank">
                                                            {replacementData.pack_list_name}
                                                        </Link>
                                                    </TableCell>
                                                </>
                                            )}
                                            {rollIndex === 0 && (
                                                <>
                                                    <TableCell rowSpan={batch.rolls.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                        {batch.batch_name}
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                {roll.pack_number}
                                            </TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                {roll.quantity} {roll.quantity_units}
                                            </TableCell>
                                            {batchIndex === 0 && rollIndex === 0 && (
                                                <>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>{replacementData.total_quantity?.quantity} {replacementData.total_quantity?.quantity_units}</TableCell>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}></TableCell>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}></TableCell>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}></TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    );
                                })
                            ))
                        )}
                        
                    </TableBody>
                </Table>
            </>}
        </>
    );
};

export default ReplacementDetails;
