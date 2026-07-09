import React, { useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { Table, TableHead, TableRow, TableCell, TableBody, IconButton, Box, Link, List, ListItem, ListItemText, Typography, useTheme, Tooltip } from '@mui/material';
import NextLink from 'next/link';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import InfoIcon from '@mui/icons-material/Info';
import { commercialInvoiceSummaryPageURL, outgoingPaymentDetailPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import RitzModal from '@/components/Ritz/RitzModal';
import CreateOutgoingPayment from './CreateOutgoingPayment';
import EditIcon from '@mui/icons-material/Edit';
import { formatAmount } from '@/helpers/Utilities';

const PCLOutgoingPayments = ({ dataSet, refreshData }: any) => {
    const theme = useTheme()
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false);
    const [modalData, setModalData] = useState<any>({});

    const handleOpenOutgoingCreateModal = (modalStatus: any, outgoingPaymentId: any, type: any, supplierPoOrDeliveryInvoiceId: any) => {
        setModalData({ modalStatus: modalStatus, outgoingPaymentId: outgoingPaymentId, type: type, supplierPoOrDeliveryInvoiceId: supplierPoOrDeliveryInvoiceId })
    }

    return (
        <>
            {modalData?.modalStatus && (
                <RitzModal
                    open={modalData?.modalStatus}
                    onClose={() => { handleOpenOutgoingCreateModal(false, null, null, null) }}
                    title={modalData?.invoiceId ? "Update Outgoing Payment" : "Create Outgoing Payment"}
                >
                    <CreateOutgoingPayment outgoingPaymentId={modalData?.outgoingPaymentId} outgoingPaymentType={modalData?.type} supplierPoOrDeliveryInvoiceId={modalData?.supplierPoOrDeliveryInvoiceId} handleSavedData={() => { setModalData({ modalStatus: false, invoiceId: null }), refreshData() }} />
                </RitzModal>
            )}

            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }} rowSpan={2}>Invoice</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }} colSpan={4}>Outgoing Payment</TableCell>
                            </TableRow>
                            <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Outgoing Payment No</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Amount</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Payment Method</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Payment Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dataSet?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No result found.</TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {dataSet?.map((invoice: any, invoiceIndex: any) => (
                                        invoice?.outgoing_payments?.length > 0 ? (
                                            invoice?.outgoing_payments?.map((outgoingPayment: any, outgoingPaymentIndex: any) => (
                                                <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                    {outgoingPaymentIndex === 0 && (
                                                        <TableCell
                                                            sx={{
                                                                border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                textAlign: 'left',
                                                            }}
                                                            rowSpan={invoice?.outgoing_payments?.length}
                                                        >
                                                            {invoice?.display_number}
                                                        </TableCell>
                                                    )}
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                        <Link component={NextLink} href={outgoingPaymentDetailPageURL(outgoingPayment?.id)}>
                                                            {outgoingPayment?.display_number}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                        {formatAmount(outgoingPayment?.amount?.amount)} {outgoingPayment?.amount?.amount_currency}
                                                    </TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                        {outgoingPayment?.payment_method_display}
                                                    </TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                        {outgoingPayment?.payment_date}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{invoice?.display_number}</TableCell>
                                                <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                    <Box display="flex" alignItems="center" justifyContent="center">
                                                        <InfoIcon sx={{ color: 'error.main', marginRight: 1 }} />
                                                        <Typography >
                                                            No available outgoing payments related to this invoice
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    ))}
                                </>
                            )}
                        </TableBody>
                    </Table>
                </>
            )}
        </>
    );
};

export default PCLOutgoingPayments;