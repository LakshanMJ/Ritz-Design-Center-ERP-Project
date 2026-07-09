import React, { useEffect, useState } from "react";
import { Box, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useTheme } from "@mui/material";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { prevoiusSpeedConsumptionListURL } from "@/helpers/constants/rest_urls/CostingUrls";
import { orderSummaryURL } from "@/helpers/constants/FrontEndUrls";
import NextLink from 'next/link';

const SystemMatchingPlacementConsumptions = ({ itemId, versionId, refreshData }: any) => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [systemMatchingDetails, setSystemMatchingDetails] = useState<any>({})

    const fetchData = () => {
        Promise.all([
            api.get(prevoiusSpeedConsumptionListURL(itemId, versionId)),
        ]).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [systemMatchingList] = respData;
            setSystemMatchingDetails({ ...systemMatchingList })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    useEffect(() => {
        if (itemId) {
            fetchData();
        }
    }, [itemId]);

    return (
        <>

            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>

                        <>
                            <Box sx={{ mt: 1, overflowX: 'auto', width: '100%' }}>
                                <TableContainer sx={{ minWidth: '800px' }}>
                                    <Table aria-label="simple table">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}>Costing</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}>Item</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}>Image</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%' }}>Ratio</TableCell>
                                                {systemMatchingDetails?.results?.[0]?.placements?.map((placement: any) => (
                                                    <TableCell key={keyHelper.getNextKeyValue()}
                                                        sx={{
                                                            border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                            minWidth: '150px',
                                                            textAlign: 'center',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        }}>
                                                        {placement?.name}
                                                    </TableCell>
                                                ))}
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', width: '15%' }}>Final YY</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {systemMatchingDetails?.results?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available data .</TableCell>
                                                </TableRow>
                                            ) : (
                                                systemMatchingDetails?.results?.map((costing: any, itemIndex: any) => (
                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>   <Link target='blank' component={NextLink} href={orderSummaryURL(costing.order_id)}>{costing?.order}</Link></TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{costing?.item_name}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                            {costing?.image ? (
                                                                <img
                                                                    src={costing?.image?.file_path}
                                                                    alt={'img'}
                                                                    style={{
                                                                        width: '200px',
                                                                        height: '200px',
                                                                        objectFit: 'cover',
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Typography variant="body2" color="textSecondary">
                                                                    No Image Available
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{costing?.ratio}</TableCell>
                                                        {costing?.placements?.map((placement: any) => (
                                                            <TableCell key={keyHelper.getNextKeyValue()} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                {placement?.estimated_consumption_ratio || '--'}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', width: '15%' }}>{costing?.total_yy}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </>
                    </Box>
                </>
            )}
        </>
    );
};

export default SystemMatchingPlacementConsumptions;
