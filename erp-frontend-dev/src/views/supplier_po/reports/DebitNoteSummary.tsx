import React, { useEffect, useState } from "react"
import { Link, Table, TableBody, TableCell, TableHead, TableRow, useTheme } from '@mui/material';
import DefaultLoader from "@/components/DefaultLoader";
import { grnSummaryReportURL } from "@/helpers/constants/front_end/GrnUrls";
import CustomerBrandMaterialDetail from "@/views/settings/userdefine_material/MaterialDetail";
import RitzModal from "@/components/Ritz/RitzModal";
import CreatedDebitNoteDetails from "./CreatedDebitNoteDetails";

const DebitNoteSummary = ({ dataList, spoId, selectedId, isPOClub }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const [debitNoteSummary, setDebitNoteSummary] = useState<any>({});
    const [showMaterialDetails, setShowMaterialDetails] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState(null);
    const [showDebitNoteDetailsModal, setShowDebitNoteDetailsModal] = useState({ modalActiveStatus: false, debitNoteId: null });
    const handleClickDebitNote = (debitNoteId: any) => {
        setShowDebitNoteDetailsModal({ modalActiveStatus: true, debitNoteId: debitNoteId })
    };
    
    const handleViewGRNSummary = (spoId: any, reportId: any, reportType: any) => {
       const url = grnSummaryReportURL(spoId, reportId, reportType, selectedId, isPOClub);
       window.open(url, '_blank');
    };

    useEffect(() => {
        if (dataList) {
            setDebitNoteSummary(dataList)
        }
    }, [dataList]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                {showMaterialDetails &&
                    <CustomerBrandMaterialDetail
                        customerBrandMaterialReferenceCodeId={selectedMaterialId}
                        modalOpen={showMaterialDetails}
                        setModalOpen={()=>setShowMaterialDetails(false)}
                    />
                }
                {showDebitNoteDetailsModal.modalActiveStatus &&
                    <RitzModal maxWidth='md' open={showDebitNoteDetailsModal.modalActiveStatus} title={'Debit Note Details'} onClose={() => setShowDebitNoteDetailsModal({ modalActiveStatus: false, debitNoteId: null })}>
                        <CreatedDebitNoteDetails debitNoteId={showDebitNoteDetailsModal.debitNoteId}/>
                    </RitzModal>
                }
                <Table >
                    <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>DebitNote</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Pack List</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Reject Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Unit Price</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Value</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Reason</TableCell>
                        </TableRow>

                    </TableHead>
                    <TableBody>
                        {debitNoteSummary.quantities?.length > 0 ? (
                            debitNoteSummary.quantities?.map((quantity: any, quantityIndex: any) => (
                                <TableRow key={quantityIndex} >
                                    {quantityIndex == 0 && (
                                        <TableCell rowSpan={debitNoteSummary.quantities?.length}  sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                            <Link
                                                component="button"
                                                onClick={() => handleClickDebitNote(debitNoteSummary.id)}
                                                sx={{ mr: 1 }}
                                            >
                                                {debitNoteSummary.display_number}
                                            </Link>
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                        <Link
                                            component="button"
                                            onClick={() => { handleViewGRNSummary(spoId, quantity?.pack_list_id, 'packList') }
                                            }
                                            sx={{ mr: 1 }}
                                        >
                                            {quantity.pack_list_display_number}
                                        </Link>
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{quantity.total_quantity} {quantity.total_quantity_units_display}</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{quantity.unit_price}</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{quantity.total_price}</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{quantity.reason_display}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }} colSpan={6}>
                                        No available data.
                                    </TableCell>
                                </TableRow>
                    )}
                        {}
                    </TableBody>
                </Table>
            </>}
        </>
    );
};

export default DebitNoteSummary;
