import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Button, darken, IconButton, Link, List, ListItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import RitzModal from '@/components/Ritz/RitzModal';
import PaymentDetails from './PaymentDetails';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { pclSettlementDetailsURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import CustomerBrandMaterialDetail from '@/views/settings/userdefine_material/MaterialDetail';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import SearchIcon from '@mui/icons-material/Search';
import SaveSpinner from '@/components/SaveSpinner';

const FinanceDashboard = ({ type, poClubId }: any) => {
    const keyHelper = new ReactKeyHelper();
    const nextKey = 'next';
    const previousKey = 'previous'

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingButtonType, setIsLoadingButton] = useState(null);
    const [openDetailModal, setOpenDetailModal] = useState<any>({});
    const [financePCLSettlementDetails, setFinancePCLSettlementDetails] = useState<any>({});
    const [isOpenMaterialDetailModal, setIsOpenMaterialDetailModal] = useState<any>({});
    const [showTextField, setShowTextField] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchText, setSearchText] = useState(poClubId);

    const handleToggleTextField = () => {
        setShowTextField((prev) => !prev);
        setSearchText('')
    };

    const fetchData = (nextPageURL: any) => {
        setIsLoading(true);
        const requests = [api.get(nextPageURL || pclSettlementDetailsURL(rowsPerPage, searchText))];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [paymentDetails] = respData;
            setFinancePCLSettlementDetails({ ...paymentDetails })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => { setIsLoading(false), setIsLoadingButton(null) });
    }


    const handleClickCPO = (settlementId: any, paymentData: any) => {
        setOpenDetailModal({ modalStatus: true, incommingPaymentId: settlementId, selectedData: paymentData })
    }

    const handleReferenceCodeDetailOnClick = (openState: boolean, materialId: any) => {
        setIsOpenMaterialDetailModal({ modalStatus: openState, materialId: materialId });
    }

    const calculateRowSpan = (settlementDetail: any) => {
        return settlementDetail?.supplier_pos?.reduce((totalRows: number, supplierPO: any) => {
            return totalRows + (supplierPO?.delivery_dates?.length || 0);
        }, 0);
    };

    const handleNextPage = (nextPageURL: any, buttonType: any) => {
        setIsLoadingButton(buttonType);
        fetchData(nextPageURL)
    }
    const handleTextFieldChange = (event: any) => {
        setSearchText(event.target.value);
    };

    useEffect(() => {
        fetchData(null)
    }, [searchText]);


    return (
        <>
            {isOpenMaterialDetailModal.modalStatus &&
                <CustomerBrandMaterialDetail
                    customerBrandMaterialReferenceCodeId={isOpenMaterialDetailModal?.materialId}
                    modalOpen={isOpenMaterialDetailModal.modalStatus}
                    setModalOpen={() => { setIsOpenMaterialDetailModal({ modalStatus: false, materialId: null }) }}
                />
            }
            {openDetailModal.modalStatus && (
                <RitzModal open={openDetailModal.modalStatus} maxWidth='md' title={"Payment Details"} onClose={() => setOpenDetailModal({ modalStatus: false, incommingPaymentId: null, selectedData: null })}>
                    <PaymentDetails incommingPaymentId={openDetailModal?.incommingPaymentId} />
                </RitzModal>
            )}
            {type != 'pcl_summary' && (
                <>
                    <Box>
                        <Typography variant='h1' color='text.primary' sx={{ mt: 2 }}>{'Finance - PCL Settlement'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {showTextField && (
                                <TextField
                                    id="standard-basic"
                                    label="Search Text"
                                    variant="standard"
                                    sx={{ mr: 1 }}
                                    value={searchText}
                                    onChange={handleTextFieldChange}
                                />
                            )}
                            <IconButton onClick={handleToggleTextField}>
                                <SearchIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </>
            )}

            <>

                <Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Customer</TableCell>
                                <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Customer PO</TableCell>
                                <TableCell colSpan={3} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'center' }}>Incoming Payments</TableCell>
                                <TableCell colSpan={6} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'center' }}>Outgoing Payments</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Amount</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Balance</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Payments</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Supplier</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Delivery</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Items</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>PCL Value</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>PCL Due Date</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Covered Customer PO</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={11} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                        <DefaultLoader />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                financePCLSettlementDetails?.results?.length === 0 ? (
                                    <>
                                        <TableRow><TableCell colSpan={11}  sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No data available</TableCell></TableRow>
                                    </>
                                ) : (
                                    financePCLSettlementDetails?.results?.map((settlementDetail: any, settlementIndex: any) => (
                                        settlementDetail?.supplier_pos?.length === 0 ? (
                                            <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{settlementDetail?.buyer_name}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}><Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderClubDetailsPageURL(settlementDetail.id)}> {settlementDetail?.display_number}</Link></TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{formatAmount(settlementDetail?.amount?.amount)} {settlementDetail?.amount?.amount_currency}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{formatAmount(settlementDetail?.balance?.amount)} {settlementDetail?.balance?.amount_currency}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                    <List>
                                                        {settlementDetail?.incoming_payments?.length == 0 ? (
                                                            <>
                                                                <Typography>{"--"}</Typography>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {settlementDetail?.incoming_payments?.map((payment: any, paymentIndex: any) => (
                                                                    <ListItem
                                                                        key={`${keyHelper.getNextKeyValue()}`}
                                                                        sx={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            padding: 0,
                                                                            flexWrap: 'wrap'
                                                                        }}
                                                                    >
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                                                                            <FiberManualRecordIcon
                                                                                sx={{ fontSize: 'small', marginRight: '8px' }}
                                                                                color='primary'
                                                                            />
                                                                            <Link
                                                                                component={'button'}

                                                                                onClick={() => handleClickCPO(payment?.id, payment)}
                                                                            >
                                                                                <Typography>{payment.display_number}</Typography>
                                                                            </Link>
                                                                        </Box>
                                                                    </ListItem>
                                                                ))}
                                                            </>
                                                        )}

                                                    </List>
                                                </TableCell>
                                                <TableCell colSpan={6} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No Available Supplier POs</TableCell>
                                            </TableRow>
                                        ) : (
                                            settlementDetail?.supplier_pos?.map((supplierPO: any, supplierPOIndex: any) => (
                                                supplierPO?.delivery_dates?.map((outgoingPayment: any, outgoingPaymentIndex: any) => (
                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                        {outgoingPaymentIndex === 0 && supplierPOIndex === 0 && (
                                                            <>
                                                                <TableCell
                                                                    rowSpan={calculateRowSpan(settlementDetail)}
                                                                    sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                                >
                                                                    {settlementDetail?.buyer_name}
                                                                </TableCell>
                                                                <TableCell
                                                                    rowSpan={calculateRowSpan(settlementDetail)}
                                                                    sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                                >
                                                                    <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderClubDetailsPageURL(settlementDetail.id)}> {settlementDetail?.display_number}</Link>

                                                                </TableCell>
                                                                <TableCell
                                                                    rowSpan={calculateRowSpan(settlementDetail)}
                                                                    sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                                >
                                                                    {formatAmount(settlementDetail?.amount?.amount)} {settlementDetail?.amount?.amount_currency}
                                                                </TableCell>
                                                                <TableCell
                                                                    rowSpan={calculateRowSpan(settlementDetail)}
                                                                    sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                                >
                                                                    {formatAmount(settlementDetail?.balance?.amount)} {settlementDetail?.balance?.amount_currency}
                                                                </TableCell>
                                                                <TableCell
                                                                    rowSpan={calculateRowSpan(settlementDetail)}
                                                                    sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                                >
                                                                    <List>
                                                                        {settlementDetail?.incoming_payments?.length == 0 ? (
                                                                            <>
                                                                                <Typography sx={{ textAlign: 'center' }}>{"--"}</Typography>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                {settlementDetail?.incoming_payments?.map((payment: any, paymentIndex: any) => (
                                                                                    <ListItem
                                                                                        key={`${keyHelper.getNextKeyValue()}`}
                                                                                        sx={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            padding: 0,
                                                                                            flexWrap: 'wrap'
                                                                                        }}
                                                                                    >
                                                                                        <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                                                                                            <FiberManualRecordIcon
                                                                                                sx={{ fontSize: 'small', marginRight: '8px' }}
                                                                                                color='primary'
                                                                                            />
                                                                                            <Link
                                                                                                component={'button'}

                                                                                                onClick={() => handleClickCPO(payment?.id, payment)}
                                                                                            >
                                                                                                <Typography>{payment.display_number}</Typography>
                                                                                            </Link>
                                                                                        </Box>
                                                                                    </ListItem>
                                                                                ))}
                                                                            </>
                                                                        )}

                                                                    </List>
                                                                </TableCell>
                                                            </>
                                                        )}
                                                        {outgoingPaymentIndex === 0 && (
                                                            <TableCell rowSpan={supplierPO?.delivery_dates?.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <Typography>
                                                                        {supplierPO?.supplier_name}
                                                                    </Typography>
                                                                    <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={supplierPO?.attachment_file_path || '#'}>
                                                                        ({supplierPO?.supplier_po_number})
                                                                    </Link>
                                                                </Box>
                                                            </TableCell>
                                                        )}

                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                                <Typography>
                                                                    {outgoingPayment?.display_number}
                                                                </Typography>
                                                                {outgoingPayment?.invoice?.file_path && outgoingPayment?.invoice?.display_number && (
                                                                    <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={outgoingPayment?.invoice?.file_path || '#'}>
                                                                        ({outgoingPayment?.invoice?.display_number})
                                                                    </Link>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            <List>
                                                                {outgoingPayment?.materials?.map((item: any, itemIndex: any) => (
                                                                    <ListItem
                                                                        key={`${keyHelper.getNextKeyValue()}`}
                                                                        sx={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            padding: 0,
                                                                            flexWrap: 'wrap'
                                                                        }}
                                                                    >
                                                                        <FiberManualRecordIcon
                                                                            sx={{ fontSize: 'small', marginRight: '8px' }}
                                                                            color='primary'
                                                                        />
                                                                        <Typography>{item?.customer_brand_material_details?.material_label}</Typography>
                                                                        <Box
                                                                            sx={{
                                                                                display: 'flex',
                                                                                flexWrap: 'wrap',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                                whiteSpace: 'nowrap',
                                                                                flexGrow: 1
                                                                            }}
                                                                        >
                                                                            <Typography component="span">
                                                                                (<Link
                                                                                    sx={{ cursor: 'pointer', wordBreak: 'break-word' }}
                                                                                    onClick={() => handleReferenceCodeDetailOnClick(true, item?.customer_brand_material_details?.customer_brand_material_code_id)}
                                                                                    target="_blank"
                                                                                >
                                                                                    {item?.customer_brand_material_details?.ritz_customer_brand_reference_code}
                                                                                </Link>)
                                                                            </Typography>
                                                                        </Box>
                                                                    </ListItem>
                                                                ))}
                                                            </List>
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            {formatAmount(outgoingPayment?.pcl_value?.amount)} {outgoingPayment?.pcl_value?.amount_currency}
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, whiteSpace: 'nowrap' }}>
                                                            {outgoingPayment?.pcl_date || '--'}
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            <List>
                                                                {outgoingPayment?.covered_customer_po?.length == 0 ? (
                                                                    <>
                                                                        <Typography sx={{ textAlign: 'center' }}>{"--"}</Typography>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {outgoingPayment?.covered_customer_po?.map((coveredPO: any, coveredPOIndex: any) => (
                                                                            <ListItem
                                                                                key={`${keyHelper.getNextKeyValue()}`}
                                                                                sx={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    padding: 0,
                                                                                    flexWrap: 'wrap'
                                                                                }}
                                                                            >
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                                                                                    <FiberManualRecordIcon
                                                                                        sx={{ fontSize: 'small', marginRight: '8px' }}
                                                                                        color='primary'
                                                                                    />
                                                                                        <Typography>{coveredPO.display_number}</Typography>
                                                                                </Box>
                                                                            </ListItem>
                                                                        ))}
                                                                    </>
                                                                )}

                                                            </List>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ))
                                        )
                                    ))
                                )

                            )}
                        </TableBody>

                    </Table>
                    </TableContainer>
                    {type != 'pcl_summary' && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {financePCLSettlementDetails?.[previousKey] && (
                                    <Button
                                        onClick={() => { handleNextPage(financePCLSettlementDetails?.previous, previousKey) }}
                                        variant="contained"
                                        color="primary"
                                        sx={{ mr: 2 }}
                                    > {isLoadingButtonType == previousKey && <SaveSpinner />}Previous</Button>
                                )}
                                {financePCLSettlementDetails?.[nextKey] && (
                                    <Button
                                        onClick={() => { handleNextPage(financePCLSettlementDetails?.next, nextKey) }}
                                        variant="contained"
                                        color="primary"
                                    >{isLoadingButtonType == nextKey && <SaveSpinner />}Next</Button>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            </>

        </>
    );
};

export default FinanceDashboard;
