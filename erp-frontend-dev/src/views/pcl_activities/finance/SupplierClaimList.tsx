import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { Box, Card, CardActionArea, CardContent, Link, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography, useTheme } from '@mui/material';
import ContentPasteSearchIcon from '@mui/icons-material/ContentPasteSearch';
import { customersURL } from '@/helpers/constants/RestUrls';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { supplierClaimListURL } from '@/helpers/constants/rest_urls/CostingUrls';
import RitzModal from '@/components/Ritz/RitzModal';
import CISummary from '@/views/supplier_po/reports/CISummary';
import RemediationAnswers from '@/views/pcl_activities/finance/RemediationAnswers';
import NextLink from 'next/link';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';

const SupplierClaimList = () => {
    const keyHelper = new ReactKeyHelper();
    const theme = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingClaimList, setIsLoadingClaimList] = useState(false);
    const [customerdata, setCustomerData] = useState<any>([]);
    const [supplierClaimList, setSupplierClaimList] = useState<any>([])
    const [selectedCustomer, setSelectedCustomer] = useState<any>('all');
    const [openFindSolutionModal, setOpenFindSolutionModal] = useState<any>({ modalStatus: false, spoId: null, sourceId: null, invoiceId: null, isPoClub: false });
    const [openAnsweringModal, setOpenAnsweringModal] = useState<any>({ modalStatus: false, solutions: [] });

    const getStatusColor = (is_solution_found: any, issues: any, merchantAttemptStatus: any) => {
        if (is_solution_found && issues?.length > 0 && !merchantAttemptStatus) return '#36AE7C'; // green (light)
        if (!is_solution_found && issues?.length > 0 && !merchantAttemptStatus) return '#EB5353'; // red (light)

        if (merchantAttemptStatus) return '#187498';
        if (issues?.length === 0) return 'white';
        return 'white';
    };

    const fetchData = (type: any, initialLoadStatus: any) => {
        setIsLoadingClaimList(true);
        const requests = [
            api.get(supplierClaimListURL(type)),
        ];
        if (initialLoadStatus) {
            requests.push(api.get(customersURL()));
        }
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [claimList, customers] = respData;
            setSupplierClaimList({ ...claimList });
            if (initialLoadStatus) {
                setCustomerData([...customers]);
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {setIsLoading(false); setIsLoadingClaimList(false)});
    }

    const handleCustomerOnChange = (event: any, newCustomer: any) => {
        setSelectedCustomer(newCustomer);
        fetchData(newCustomer || 'all', false);
    };

    const handleOpenFindSolution = (modalStatus: boolean, spoId: number, sourceId: number, invoiceId: number, isPoClub: boolean) => {
        setOpenFindSolutionModal({
            modalStatus,
            spoId,
            sourceId,
            invoiceId,
            isPoClub,
        });
    };
    const handleOpenAnswerModal = (modalStatus: boolean, selectedSolutions: any) => {
        console.log(selectedSolutions, "selectedSolutions")
        setOpenAnsweringModal({
            modalStatus,
            solutions: selectedSolutions,
        });
    }
    useEffect(() => {
        fetchData('all', true)
    }, []);

    return (
        <>
            {openFindSolutionModal.modalStatus && (
                <RitzModal
                    onClose={() => { handleOpenFindSolution(false, null, null, null, false), fetchData(selectedCustomer, false) }}
                    title={"Find Solution"}
                    open={openFindSolutionModal.modalStatus}
                    maxWidth='xl'
                    fullWidth>
                    <CISummary spoId={openFindSolutionModal?.spoId} invoiceId={openFindSolutionModal?.invoiceId} sourceId={openFindSolutionModal?.sourceId} isPoClub={openFindSolutionModal?.isPoClub} />
                </RitzModal>
            )}
            {openAnsweringModal.modalStatus && (
                <RitzModal
                    onClose={() => handleOpenAnswerModal(false, null)}
                    title={"Answers"}
                    open={openAnsweringModal.modalStatus}
                    maxWidth='xl'
                    fullWidth>
                    <RemediationAnswers answers={openAnsweringModal.solutions} />
                </RitzModal>
            )}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <Typography variant='h1' color='text.primary'>Supplier Claim Dashboard</Typography>
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Customer</Typography>
                        <Box sx={{ display: 'flex' }}>
                            <ToggleButtonGroup
                                color="primary"
                                value={selectedCustomer}
                                exclusive
                                onChange={handleCustomerOnChange}
                                aria-label="Customer"
                                sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                            >
                                <ToggleButton
                                    style={{ height: '4em', minWidth: '150px', border: '1px solid #E0E0E0', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginBottom: '10px', }} value='all'>
                                    All
                                </ToggleButton>
                                {customerdata.map((customer: any) => (
                                    <ToggleButton key={customer.id} style={{
                                        height: '4em',
                                        minWidth: '150px',
                                        border: '1px solid #E0E0E0',
                                        borderRadius: '5px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        marginBottom: '10px',
                                    }} value={customer.id}>
                                        {customer.name}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={3} sx={{ mb: 2, mt: 2 }}>
                        {/* Red */}
                        <Box display="flex" alignItems="center">
                            <Box width={16} height={16} bgcolor="#36AE7C" borderRadius={1} mr={1} />
                            <Typography variant="body2">Solution is found</Typography>
                        </Box>

                        {/* Yellow */}
                        <Box display="flex" alignItems="center">
                            <Box width={16} height={16} bgcolor="#EB5353" borderRadius={1} mr={1} />
                            <Typography variant="body2">Answer is pending</Typography>
                        </Box>
                        {/* red */}
                        <Box display="flex" alignItems="center">
                            <Box width={16} height={16} bgcolor="#187498" borderRadius={1} mr={1} />
                            <Typography variant="body2">Merchant attempt to find solution </Typography>
                        </Box>
                    </Box>
                    { isLoadingClaimList ? (
                        <DefaultLoader />
                    ) : (
                        <Box>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ background: theme.palette.grey[100] }}>
                                        <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '75%', textAlign: 'center' }} >Description</TableCell>
                                        <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '15%', textAlign: 'center' }} />
                                        <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '15%', textAlign: 'center' }} />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                {supplierClaimList?.results?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} sx={{ textAlign: 'center' }}>
                                            No data available
                                        </TableCell>
                                    </TableRow>
                                )}
                                {supplierClaimList?.results?.map((claim: any, claimIndex: number) => (
                                    claim?.deliveries?.map((delivery: any, deliveryIndex: number) => {
                                        const displayName = [
                                            delivery?.costing_or_po_club_data?.short_code,
                                            claim?.supplier_po_number,
                                            delivery?.display_number,
                                            delivery?.invoice?.display_number,
                                            delivery?.invoice?.material_types?.join(' / '),
                                            delivery?.invoice?.issues?.map((issue: any) => issue.reason_display)?.join(' / ')
                                        ]
                                            .filter(Boolean)
                                            .join(' - ');

                                        return (
                                            <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                <TableCell
                                                    sx={{
                                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                        width: '75%',
                                                        textAlign: 'left',
                                                    }}
                                                >
                                                    <CardActionArea>
                                                        <Card
                                                            sx={{
                                                                //background: getStatusColor(delivery?.invoice?.is_solution_found, delivery?.invoice?.issues),
                                                                boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                                            }}
                                                        >
                                                            <CardContent>
                                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                                    <Box>
                                                                        <Typography variant="h6" sx={{ color: "#555555" }}>
                                                                            {claim?.description}
                                                                        </Typography>
                                                                        {displayName && (
                                                                            <Typography variant="subtitle2">
                                                                                {displayName}
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                    {/* Red square */}
                                                                    <Box
                                                                        sx={{
                                                                            width: 20,
                                                                            height: 20,
                                                                            backgroundColor: getStatusColor(delivery?.invoice?.is_solution_found, delivery?.invoice?.issues, delivery?.invoice?.attend_to_find_solution),
                                                                            borderRadius: 1, // optional: to slightly round corners
                                                                            ml: 2
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    </CardActionArea>
                                                </TableCell>

                                                {/* Find Solution Cell */}
                                                <TableCell
                                                    sx={{
                                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                        width: '10%',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    <CardActionArea onClick={() => { handleOpenFindSolution(true, claim?.id, delivery?.id, delivery?.invoice?.id, delivery?.costing_or_po_club_data?.type === 'po_club' ? true : false) }}>
                                                        <Card
                                                            sx={{
                                                                background: "linear-gradient(135deg, #ffffff, #ffffff)",
                                                                boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                                            }}
                                                        >
                                                            <CardContent>
                                                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                                                    <Typography
                                                                        variant="h6"
                                                                        sx={{ color: "#555555", display: 'flex', alignItems: 'center', gap: 1 }}
                                                                    >
                                                                        <ContentPasteSearchIcon />
                                                                        Find Solution
                                                                    </Typography>
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    </CardActionArea>
                                                </TableCell>

                                                {/* Answers Cell */}
                                                <TableCell
                                                    sx={{
                                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                        width: '10%',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    <CardActionArea onClick={() => { handleOpenAnswerModal(true, delivery?.invoice?.solutions) }}>
                                                        <Card
                                                            sx={{
                                                                background: "linear-gradient(135deg, #ffffff, #ffffff)",
                                                                boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                                            }}
                                                        >
                                                            <CardContent>
                                                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                                                    <Typography
                                                                        variant="h6"
                                                                        sx={{ color: "#555555", display: 'flex', alignItems: 'center', gap: 1 }}
                                                                    >
                                                                        <QuestionAnswerIcon />
                                                                        Answers
                                                                    </Typography>
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    </CardActionArea>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                    )}
                </>
            )}
        </>
    );
};

export default SupplierClaimList;
