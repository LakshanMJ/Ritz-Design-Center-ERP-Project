import React, { useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { Table, TableHead, TableRow, TableCell, TableBody, IconButton, Box, Link, List, ListItem, ListItemText, Typography, useTheme, Tooltip } from '@mui/material';
import NextLink from 'next/link';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { incomingPaymentDetailPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import EditIcon from '@mui/icons-material/Edit';
import RitzModal from '@/components/Ritz/RitzModal';
import InfoIcon from '@mui/icons-material/Info';
import PCLCreateIncomingPayment from './PCLCreateIncomingPayment';
import { formatAmount } from '@/helpers/Utilities';
import CreateOutgoingCommercialInvoice from './CreateOutgoingCommercialInvoice';

const PCLIncomingPayments = ({ dataSet, refreshData }: any) => {
    const theme = useTheme()
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false);
    const [isOpenIncomingModal, setIsOpenIncomingModal] = useState<any>({});
    const [isOpenOutgoingCommercialInvoiceModal, setIsOpenOutgoingCommercialInvoiceModal] = useState<any>({});
    const handleOpenIncomingModal = (modalStatus: any, shipmentId: any, shipmentAmount: any, incomingPaymentId: any, outgoingCommercialInvoiceId: any) => {
        setIsOpenIncomingModal({
            modalStatus: modalStatus,
            shipmentId: shipmentId,
            shipmentBalanceAmount: shipmentAmount,
            incomingPaymentId: incomingPaymentId,
            outgoingCommercialInvoiceId: outgoingCommercialInvoiceId
        })
    }
    const handleOpenOutgoingInvoiceModal = (modalStatus: any, outgoingCommercialInvoiceId: any, purchaseOrderDeliveryId: any, customerId: any) => {
        setIsOpenOutgoingCommercialInvoiceModal({
            modalStatus: modalStatus,
            outgoingCommercialInvoiceId: outgoingCommercialInvoiceId,
            customerId: customerId,
            purchaseOrderDeliveryId: purchaseOrderDeliveryId
        })
    }
    const handleSavedData = () => {
        handleOpenIncomingModal(false, null, null, null, null)
        handleOpenOutgoingInvoiceModal(false, null, null, null)
        refreshData()
    }

    return (
        <>
            {isOpenIncomingModal?.modalStatus && (
                <RitzModal
                    open={isOpenIncomingModal?.modalStatus}
                    onClose={() => { handleOpenIncomingModal(false, null, null, null, null) }}
                    title={isOpenIncomingModal?.incomingPaymentId ? "Update Incoming Payment" : "Create Incoming Payment"}
                >
                    <PCLCreateIncomingPayment
                        shipmentId={isOpenIncomingModal?.shipmentId}
                        incomingPaymentId={isOpenIncomingModal?.incomingPaymentId}
                        outgoingCommercialInvoiceId={isOpenIncomingModal?.outgoingCommercialInvoiceId}
                        shipmentBalanceAmount={isOpenIncomingModal?.shipmentBalanceAmount}
                        handleSavedData={handleSavedData} />
                </RitzModal>
            )}
            {isOpenOutgoingCommercialInvoiceModal?.modalStatus && (
                <RitzModal
                    open={isOpenOutgoingCommercialInvoiceModal?.modalStatus}
                    onClose={() => { handleOpenOutgoingInvoiceModal(false, null, null, null) }}
                    title={isOpenOutgoingCommercialInvoiceModal?.outgoingCommercialInvoiceId ? "Update Outgoing Commercial Invoice" : "Create Outgoing Commercial Invoice"}
                >
                    <CreateOutgoingCommercialInvoice
                        outgoingCommercialInvoiceId={isOpenOutgoingCommercialInvoiceModal?.outgoingCommercialInvoiceId}
                        purchaseOrderDeliveryId={isOpenOutgoingCommercialInvoiceModal?.purchaseOrderDeliveryId}
                        customerId={isOpenOutgoingCommercialInvoiceModal?.customerId}
                        handleSavedData={handleSavedData}

                    />
                </RitzModal>
            )}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Shipment</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Outgoing Commercial Invoice</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Shipment Amount</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Shipment Date</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Incoming Payment</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Incoming Amount</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Payment Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dataSet?.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        sx={{
                                            border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                            textAlign: 'center',
                                        }}
                                    >
                                        No data found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {dataSet?.map((shipment: any, shipmentIndex: number) => (
                                        shipment?.incoming_payments?.length ? (
                                            shipment.incoming_payments.map((incomingPayment: any, incomingPaymentIndex: number) => (
                                                <TableRow key={`shipment-${shipmentIndex}-payment-${incomingPaymentIndex}`}>
                                                    {incomingPaymentIndex === 0 && (
                                                        <>
                                                            <TableCell
                                                                rowSpan={shipment.incoming_payments.length}
                                                                sx={{
                                                                    border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                    textAlign: 'left',
                                                                    position: 'relative',
                                                                }}
                                                            >
                                                                {shipment.display_number}
                                                                {shipment?.outgoing_commercial_invoice_id && (
                                                                    <Tooltip title={"Add Incoming Payment"} disableInteractive>
                                                                        <IconButton
                                                                            size='small'
                                                                            color='primary'
                                                                            onClick={() => { handleOpenIncomingModal(true, shipment?.id, shipment?.balance, null, shipment?.outgoing_commercial_invoice_id) }}
                                                                            sx={{
                                                                                position: 'absolute',
                                                                                top: 4,
                                                                                right: 4,
                                                                            }}
                                                                        >
                                                                            <AddCircleOutlineIcon fontSize='inherit' />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                )}
                                                            </TableCell>
                                                            <TableCell
                                                                rowSpan={shipment.incoming_payments.length}
                                                                sx={{
                                                                    border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                    textAlign: 'left',
                                                                    position: 'relative',
                                                                }}
                                                            >
                                                                {shipment?.outgoing_commercial_invoice_id ? (
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <Link
                                                                            component={NextLink}
                                                                            target="_blank"
                                                                            href={incomingPaymentDetailPageURL(shipment.id)}
                                                                        >
                                                                            {shipment.outgoing_commercial_invoice_display_number}
                                                                        </Link>
                                                                        <Tooltip title={"Edit Outgoing Commercial Invoice"} disableInteractive>
                                                                            <IconButton
                                                                                size='small'
                                                                                color='primary'
                                                                                onClick={() => { handleOpenOutgoingInvoiceModal(true, shipment?.outgoing_commercial_invoice_id, shipment?.id, shipment?.customer) }}
                                                                            >
                                                                                <EditIcon fontSize='inherit' />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    </Box>
                                                                ) : (
                                                                    <Box display="flex" alignItems="center" justifyContent="center">
                                                                        <InfoIcon sx={{ color: 'error.main', marginRight: 1 }} />
                                                                        <Typography>
                                                                            No available Outgoing Commercial Invoice.
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                                {!shipment.outgoing_commercial_invoice_id && (
                                                                    <Tooltip title={"Create Outgoing Commercial Invoice"} disableInteractive>
                                                                        <IconButton
                                                                            size='small'
                                                                            color='primary'
                                                                            onClick={() => { handleOpenOutgoingInvoiceModal(true, null, shipment?.id, shipment?.customer) }}
                                                                            sx={{
                                                                                position: 'absolute',
                                                                                top: 4,
                                                                                right: 4,
                                                                            }}
                                                                        >
                                                                            <AddCircleOutlineIcon fontSize='inherit' />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                )}
                                                            </TableCell>
                                                            <TableCell
                                                                rowSpan={shipment.incoming_payments.length}
                                                                sx={{
                                                                    border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                    textAlign: 'left',
                                                                }}
                                                            >
                                                                {formatAmount(shipment?.amount?.amount)} {shipment?.amount?.amount_currency_display}
                                                            </TableCell>
                                                            <TableCell
                                                                rowSpan={shipment.incoming_payments.length}
                                                                sx={{
                                                                    border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                    textAlign: 'left',
                                                                }}
                                                            >
                                                                {shipment?.delivery_date}
                                                            </TableCell>
                                                        </>
                                                    )}
                                                    <TableCell
                                                        sx={{
                                                            border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                            textAlign: 'left',
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Link
                                                                component={NextLink}
                                                                target="_blank"
                                                                href={incomingPaymentDetailPageURL(shipment.id)}
                                                            >
                                                                {incomingPayment?.display_number}
                                                            </Link>
                                                            <Tooltip title={"Edit Incoming Payment"} disableInteractive>
                                                                <IconButton
                                                                    size='small'
                                                                    color='primary'
                                                                    onClick={() => { handleOpenIncomingModal(true, shipment?.id, shipment?.balance, incomingPayment?.id, shipment?.outgoing_commercial_invoice_id) }}
                                                                >
                                                                    <EditIcon fontSize='inherit' />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell
                                                        sx={{
                                                            border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                            textAlign: 'left',
                                                        }}
                                                    >
                                                        {formatAmount(incomingPayment?.amount?.amount)} {incomingPayment?.amount?.amount_currency_display}
                                                    </TableCell>
                                                    <TableCell
                                                        sx={{
                                                            border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                            textAlign: 'left',
                                                        }}
                                                    >
                                                        {incomingPayment?.payment_date}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow key={`shipment-${shipmentIndex}`}>
                                                <TableCell
                                                    sx={{
                                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                        textAlign: 'left',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {shipment.display_number}
                                                    {shipment?.outgoing_commercial_invoice_id && (
                                                        <Tooltip title={"Add Incoming Payment"} disableInteractive>
                                                            <IconButton
                                                                size='small'
                                                                color='primary'
                                                                onClick={() => { handleOpenIncomingModal(true, shipment?.id, shipment?.balance, null, shipment?.id) }}
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 4,
                                                                    right: 4,
                                                                }}
                                                            >
                                                                <AddCircleOutlineIcon fontSize='inherit' />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                                <TableCell
                                                    sx={{
                                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                        textAlign: 'left',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {shipment?.outgoing_commercial_invoice_id ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Link
                                                                component={NextLink}
                                                                target="_blank"
                                                                href={incomingPaymentDetailPageURL(shipment.id)}
                                                            >
                                                                {shipment?.outgoing_commercial_invoice_display_number}
                                                            </Link>
                                                            <Tooltip title={"Edit Outgoing Commercial Invoice"} disableInteractive>
                                                                <IconButton
                                                                    size='small'
                                                                    color='primary'
                                                                    onClick={() => { handleOpenOutgoingInvoiceModal(true, shipment?.outgoing_commercial_invoice_id, shipment?.id, shipment?.customer) }}
                                                                >
                                                                    <EditIcon fontSize='inherit' />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    ) : (
                                                        <Box display="flex" alignItems="center" justifyContent="center">
                                                            <InfoIcon sx={{ color: 'error.main', marginRight: 1 }} />
                                                            <Typography>
                                                                No available Outgoing Commercial Invoice.
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {!shipment?.outgoing_commercial_invoice_id && (
                                                        <Tooltip title={"Create Outgoing Commercial Invoice"} disableInteractive>
                                                            <IconButton
                                                                size='small'
                                                                color='primary'
                                                                onClick={() => { handleOpenOutgoingInvoiceModal(true, null, shipment?.id, shipment?.customer) }}
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 4,
                                                                    right: 4,
                                                                }}
                                                            >
                                                                <AddCircleOutlineIcon fontSize='inherit' />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                                <TableCell
                                                    sx={{
                                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                        textAlign: 'left',
                                                    }}
                                                >
                                                    {formatAmount(shipment?.amount?.amount)}{' '}{shipment?.amount?.amount_currency_display}
                                                </TableCell>
                                                <TableCell
                                                    sx={{
                                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                        textAlign: 'left',
                                                    }}
                                                >
                                                    {shipment?.delivery_date}
                                                </TableCell>
                                                <TableCell
                                                    sx={{
                                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                        textAlign: 'center',
                                                    }}
                                                    colSpan={3}
                                                >
                                                    <Box display="flex" alignItems="center" justifyContent="center">
                                                        <InfoIcon sx={{ color: 'error.main', marginRight: 1 }} />
                                                        <Typography>
                                                            No available incoming payments.
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

export default PCLIncomingPayments;