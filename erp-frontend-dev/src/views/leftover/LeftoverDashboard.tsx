import { getDefaultError } from '@/helpers/Utilities'
import api from '@/services/api'
import React, { useEffect, useState } from 'react'
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import toast from 'react-hot-toast'
import { Box, Typography, Grid, Card, CardContent, Link } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { blue, green, grey, orange, red } from '@mui/material/colors';
import TodayIcon from '@mui/icons-material/Today';
import NextLink from 'next/link';
import CachedIcon from '@mui/icons-material/Cached';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import { ColumnDef } from '@tanstack/react-table';
import RitzTable from '@/components/Ritz/RitzTable';
import CircularLoader from '@/components/CircularLoader';
import { leftoverVerificationDetailPageUrl } from '@/helpers/constants/front_end/LeftoverUrls';

const LeftoverDashboard = () => {
    const pendingKey = 'pending'
    const inProgressKey = 'in_progress'
    const completeKey = 'complete'
    const canceledKey = 'canceled'

    const [selectedType, setSelectedType] = useState([pendingKey])
    const [isLoading, setIsLoading] = useState(true);
    const [isTableRefreshing, setIsTableRefreshing] = useState(false);
    const [leftoverVerificationData, setLeftoverVerificationData] = useState([])
    const [verificationCounts, setVerificationCounts] = useState<any>({})
    const [tableTitle, setTableTitle] = useState<any>({
        [pendingKey]: 'Pending Allocations',
        [inProgressKey]: 'In Progress Allocations',
        [completeKey]: 'Completed Allocations',
        [canceledKey]: `Canceled Allocations`,
    })


    const leftoverVerificationColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'Verification No',
            cell: props => (
                <Link href={leftoverVerificationDetailPageUrl(props.row?.original?.id)} component={NextLink}>{props.row?.original?.display_number}</Link>
            ),
        },
        {
            accessorKey: 'plant_name',
            header: 'Plant',
        },
        {
            accessorKey: 'warehouse_name',
            header: 'Warehouse',
        },
        {
            accessorKey: 'state_display',
            header: 'Status',
        },
    ];
    
    const handleSelectedType = (type: any) => {
        setIsTableRefreshing(true)
        setSelectedType(type)
    }

    const fetchTableData = () => {
        setLeftoverVerificationData([])
        if (selectedType) {
            const requests = [
                api.get(GrnUrls.leftoverVerificationListURL(selectedType))
            ]

            if (Object.keys(verificationCounts) && Object.keys(verificationCounts).length === 0) {
                requests.push(api.get(GrnUrls.leftoverVerificationCountDetailsURL()));
            }

            Promise.all(requests).then(resp => {
                const respData = resp.map((r: any) => r.data);
                const [leftoverVerificationData, verificationCountData] = respData
                if (Object.keys(verificationCounts) && Object.keys(verificationCounts).length === 0) {
                    setVerificationCounts({ ...verificationCountData })
                }
                setLeftoverVerificationData([...leftoverVerificationData]);
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsLoading(false)
                setIsTableRefreshing(false)
            });
        }
    }

    useEffect(() => {
        setLeftoverVerificationData([])
        fetchTableData()
    }, [selectedType])

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant='h1' color='text.primary' sx={{ mt: 2 }}>{'Material Verification Dashboard'}</Typography>
            </Box>
            {isLoading ? <DefaultLoader /> : (
                <>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={2.4}>
                            <Card sx={{
                                ...cardStyles,
                                boxShadow: selectedType.includes(pendingKey) ? `2px 2px 2px ${blue[500]}, -2px -2px 2px ${blue[500]}, -2px 2px 2px ${blue[500]}, 2px -2px 2px ${blue[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                                borderLeft: selectedType.includes(pendingKey) ? 'none' : `5px solid ${blue[500]}`
                            }} onClick={() => handleSelectedType([pendingKey])}>
                                <CardContent>
                                    <Grid container alignItems="center">
                                        <Grid item xs={8}>
                                            <Typography variant="subtitle1" gutterBottom sx={{ color: blue[500], fontWeight: 'bold' }}>
                                                Pending
                                            </Typography>
                                            <Typography variant="h5" color="textPrimary" sx={countStyles}>
                                                {verificationCounts?.[pendingKey] || '--'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <TodayIcon
                                                sx={{
                                                    color: selectedType.includes(pendingKey) ? blue[500] : grey[400],
                                                }}
                                                fontSize="large"
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={2.4}>
                            <Card sx={{
                                ...cardStyles,
                                boxShadow: selectedType.includes(inProgressKey) ? `2px 2px 2px ${orange[500]}, -2px -2px 2px ${orange[500]}, -2px 2px 2px ${orange[500]}, 2px -2px 2px ${orange[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                                borderLeft: selectedType.includes(inProgressKey) ? 'none' : `5px solid ${orange[500]}`
                            }} onClick={() => handleSelectedType([inProgressKey])}>
                                <CardContent>
                                    <Grid container alignItems="center">
                                        <Grid item xs={8}>
                                            <Typography variant="subtitle1" gutterBottom sx={{ color: orange[500], fontWeight: 'bold' }}>
                                                In Progress
                                            </Typography>
                                            <Typography variant="h5" color="textPrimary" sx={countStyles}>
                                                {verificationCounts?.[inProgressKey] || '--'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <CachedIcon
                                                sx={{
                                                    color: selectedType.includes(inProgressKey) ? orange[500] : grey[400],
                                                }}
                                                fontSize="large"
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={2.4}>
                            <Card sx={{
                                ...cardStyles,
                                boxShadow: selectedType.includes(canceledKey) ? `2px 2px 2px ${red[500]}, -2px -2px 2px ${red[500]}, -2px 2px 2px ${red[500]}, 2px -2px 2px ${red[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                                borderLeft: selectedType.includes(canceledKey) ? 'none' : `5px solid ${red[500]}`
                            }} onClick={() => handleSelectedType([canceledKey])}>
                                <CardContent>
                                    <Grid container alignItems="center">
                                        <Grid item xs={8}>
                                            <Typography variant="subtitle1" gutterBottom sx={{ color: red[500], fontWeight: 'bold' }}>Canceled</Typography>
                                            <Typography variant="h5" color="textPrimary" sx={countStyles}>{verificationCounts?.[canceledKey] || '--'}</Typography>
                                        </Grid>
                                        <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <EventBusyIcon
                                                sx={{
                                                    color: selectedType.includes(canceledKey) ? red[500] : grey[400],
                                                }}
                                                fontSize="large"
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={2.4}>
                            <Card sx={{
                                ...cardStyles,
                                boxShadow: selectedType.includes(completeKey) ? `2px 2px 2px ${green[500]}, -2px -2px 2px ${green[500]}, -2px 2px 2px ${green[500]}, 2px -2px 2px ${green[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                                borderLeft: selectedType.includes(completeKey) ? 'none' : `5px solid ${green[500]}`
                            }} onClick={() => handleSelectedType([completeKey])}>
                                <CardContent>
                                    <Grid container alignItems="center">
                                        <Grid item xs={8}>
                                            <Typography variant="subtitle1" gutterBottom sx={{ color: green[500], fontWeight: 'bold' }}>
                                                Completed Deliveries
                                            </Typography>
                                            <Typography variant="h5" color="textPrimary" sx={countStyles}>
                                                {verificationCounts?.[completeKey] || '--'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <ChecklistRtlIcon
                                                sx={{
                                                    color: selectedType.includes(completeKey) ? green[500] : grey[400],
                                                }}
                                                fontSize="large"
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 5 }}>
                        <Typography variant='h4'>{tableTitle[selectedType as unknown as string]}</Typography>
                        {isTableRefreshing ? <CircularLoader /> : (
                            <RitzTable
                                data={leftoverVerificationData}
                                columns={leftoverVerificationColumns}
                            />
                        )}
                    </Box>
                </>
            )}
        </>
    )
}

export default LeftoverDashboard

const cardStyles = {
    height: '100%',
    '&:hover': {
        transform: 'scale(1.05)',
        cursor: 'pointer',
    }
}

const countStyles = {
    color: grey[600]
}