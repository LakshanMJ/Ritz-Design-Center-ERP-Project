import React, { useEffect, useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import { Box, Link, Typography, Grid, Card, CardContent } from '@mui/material';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import { ReactKeyHelper } from '@/helpers/KeyHelper';

const PCLMatchedDetails = ({ clubId, dataSet }: any) => {
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false);

    return (
        <>

            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Grid container direction="row" sx={{ display: 'flex' }}>
                        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: 'none', }}>
                                <CardContent>
                                    <Box>
                                        {[
                                            { label: 'PO Club :', value: <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderClubDetailsPageURL(dataSet?.base_po_club_data?.po_club?.id)}> {dataSet?.base_po_club_data?.po_club?.display_number}</Link> },
                                            { label: 'Material FOB (%) :', value: `${dataSet?.base_po_club_data?.po_club?.fob_presentage}` },
                                            { label: 'Max PCL :', value: `${formatAmount(dataSet?.base_po_club_data?.po_club?.max_pcl_value?.amount)}  ${dataSet?.base_po_club_data?.po_club?.max_pcl_value?.amount_currency_display}` },
                                            { label: 'Utilized Value :', value: `${formatAmount(dataSet?.base_po_club_data?.po_club?.utilized_value?.amount)}  ${dataSet?.base_po_club_data?.po_club?.utilized_value?.amount_currency_display}` },
                                            { label: 'Excess Value :', value: `${formatAmount(dataSet?.base_po_club_data?.po_club?.excess_value?.amount)}  ${dataSet?.base_po_club_data?.po_club?.excess_value?.amount_currency_display}` },
                                            { label: 'Shipment Date :', value: `${dataSet?.base_po_club_data?.po_club?.shipment_dates?.join(' , ') || 'N/A'}` },
                                        ].map((item, index) => (
                                            <Box
                                                key={`${keyHelper.getNextKeyValue()}`}
                                                display="flex"
                                                alignItems="center"
                                                mb={1}
                                                sx={{ width: '100%' }}
                                            >
                                                <Typography
                                                    variant="body1"
                                                    sx={{ fontWeight: 'bold', width: '150px', flexShrink: 0 }}
                                                >
                                                    {item.label}
                                                </Typography>
                                                <Typography variant="body1">{item.value}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid
                            item
                            xs={12}
                            md={8}
                            sx={{
                                backgroundColor: '#f5f5f5',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                            }}
                        >
                            <Card
                                sx={{
                                    flex: 1,
                                    boxShadow: 'none',
                                    borderRadius: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                }}
                            >

                                <CardContent
                                    sx={{
                                        flex: 1,
                                        overflowY: 'auto',
                                        padding: 2,
                                        transition: 'background-color 0.5s ease',
                                    }}
                                >
                                    <Grid container spacing={2}>
                                        {dataSet?.derived_po_clubs_data?.map((pos: any, index: number) => (
                                            <Grid item xs={12} sm={6} md={4} key={index}>
                                                <Card
                                                    sx={{
                                                        boxShadow: 1,
                                                        borderRadius: 2,
                                                        border: '2px solid green',
                                                        height: '100%',
                                                    }}
                                                >
                                                    <CardContent>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                mb: 1,
                                                            }}
                                                        >
                                                            <Typography variant="h4">
                                                                <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderClubDetailsPageURL(pos?.po_club?.id)}> {pos?.po_club?.display_number}</Link>
                                                            </Typography>
                                                        </Box>

                                                        <Typography variant="body1">
                                                            <Typography component="span" fontWeight={'bold'}>
                                                                Material FOB (%):
                                                            </Typography> {pos?.po_club?.fob_presentage || '--'}
                                                        </Typography>
                                                        <Typography variant="body1">
                                                            <Typography component="span" fontWeight={'bold'}>
                                                                Max PCL:
                                                            </Typography> {formatAmount(pos?.po_club?.max_pcl_value?.amount || '--')} {pos?.po_club?.max_pcl_value?.amount_currency_display}
                                                        </Typography>
                                                        <Typography variant="body1">
                                                            <Typography component="span" fontWeight={'bold'}>
                                                                Short Value:
                                                            </Typography> {formatAmount(pos?.po_club?.short_value?.amount || '--')} {pos?.po_club?.short_value?.amount_currency_display}
                                                        </Typography>
                                                        <Typography variant="body1">
                                                            <Typography component="span" fontWeight={'bold'}>
                                                                Earliest PCL Date:
                                                            </Typography> {pos?.po_club?.earliest_pcl_date || '--'                                                            }
                                                        </Typography>
                                                        <Typography variant="body1">
                                                            <Typography component="span" fontWeight={'bold'}>
                                                                Reason:
                                                            </Typography> <Typography fontWeight={'bold'} component="span" sx={{ color: 'error.main' }}>{pos?.po_club?.reason || '--'}</Typography>
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </>
            )}

        </>
    );
};

export default PCLMatchedDetails;