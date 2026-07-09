import React, { useEffect, useState } from "react"
import { Alert, Box, Link, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography, useTheme } from '@mui/material';
import DefaultLoader from "@/components/DefaultLoader";
import {  grnSummaryReportURL } from "@/helpers/constants/front_end/GrnUrls";
import RitzModal from "@/components/Ritz/RitzModal";
import CreatedDebitNoteDetails from "./CreatedDebitNoteDetails";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CustomerBrandMaterialDetail from "@/views/settings/userdefine_material/MaterialDetail";

const CombineDetails = ({ dataList, materialData, isVisibleCPI, deliveryId, spoId, isVisibleReplacement, isVisibleDebitNote = true, materialType, modalType, sourceId, isPoClub }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const [combineData, setCombineData] = useState<any>(dataList);
    const [showDebitNoteDetailsModal, setShowDebitNoteDetailsModal] = useState({ modalActiveStatus: false, materialId: null, debitNoteId: null });
    const [showMaterialDetailsModal, setShowMaterialDetailsModal] = useState({modalStatus: null, materialId: null});

    const handleClickDebitNote = (materialId: any, debitNoteId: any) => {
        setShowDebitNoteDetailsModal({ modalActiveStatus: true, materialId: materialId, debitNoteId: debitNoteId })
    };
    const handleViewGRNSummary = (spoId: any, reportId: any, reportType: any) => {
        const url = grnSummaryReportURL(spoId, reportId, reportType, sourceId, isPoClub);
        window.open(url, '_blank');
    };

    useEffect(() => {
        if (dataList) {
            setCombineData(dataList)
        }
    }, [dataList]);

    return (
        <>
            {showMaterialDetailsModal.modalStatus &&
                <CustomerBrandMaterialDetail
                    customerBrandMaterialReferenceCodeId={showMaterialDetailsModal?.materialId}
                    modalOpen={showMaterialDetailsModal?.modalStatus}
                    setModalOpen={() => { setShowMaterialDetailsModal({ modalStatus: false, materialId: null }) }}
                />
            }
            {isLoading ? <DefaultLoader /> : <>
                {showDebitNoteDetailsModal.modalActiveStatus &&
                    <RitzModal maxWidth='md' open={showDebitNoteDetailsModal?.modalActiveStatus} title={'Debit Note Details'} onClose={() => setShowDebitNoteDetailsModal({ modalActiveStatus: false, materialId: null, debitNoteId: null })}>
                        <CreatedDebitNoteDetails debitNoteId={showDebitNoteDetailsModal?.debitNoteId}/>
                    </RitzModal>
                }
                <Box sx={{ mt: 1 }} >
                    {materialType == 'fabric' ? (
                        <>
                        {(modalType == 'short_remediation' || modalType == 'mismatch_remediation' || modalType == 'width_remediation' )  ? (
                        <>
                            <Table >
                                <TableHead>
                                    <TableRow sx={{ background: theme.palette.grey[100] }}>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Delivery</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Material Description</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Total Quantity</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Unit Price</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Value</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                            <Link
                                                component="button"
                                                onClick={() =>
                                                    handleViewGRNSummary(spoId, deliveryId, 'deliveryDate')
                                                }
                                                sx={{ mr: 1 }}
                                            >
                                                {materialData.delivery_date}
                                            </Link>
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                            <Box display="flex" alignItems="center">
                                                {materialData?.ritz_code}
                                                    <OpenInNewIcon
                                                        sx={{ml: 1,color: 'rgb(25, 118, 210)',cursor: 'pointer',}}
                                                        onClick={() =>
                                                            setShowMaterialDetailsModal({
                                                                modalStatus: true,
                                                                materialId: materialData?.customer_brand_material_id,
                                                            })
                                                        }
                                                        />
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{Math.abs(combineData?.total_quantity?.quantity)} {combineData?.total_quantity?.quantity_units_display}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{combineData?.unit_price}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{Math.abs(combineData?.total_price)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>

                        </>
                    ) : (
                        <>
                            <Table >
                                <TableHead>
                                    <TableRow sx={{ background: theme.palette.grey[100] }}>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Delivery</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Material Description</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Pack List</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Batch#</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Roll#</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Quantity</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {combineData?.batches?.length === 0 ? (
                                        <>
                                            <TableRow>
                                                <TableCell colSpan={7} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>
                                                    No details available
                                                </TableCell>
                                            </TableRow>
                                        </>
                                    ) : (
                                        <>
                                            {combineData?.batches?.map((batch: any, batchIndex: number) => (
                                                batch.rolls?.map((roll: any, rollIndex: number) => {
                                                    const totalRows = combineData?.batches?.reduce((acc: number, batch: any) => {
                                                        return acc + batch?.rolls?.length;
                                                    }, 0);

                                                    return (
                                                        <TableRow key={`${batchIndex}-${rollIndex}`}>
                                                            {batchIndex === 0 && rollIndex === 0 && (
                                                                <>
                                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                        <Link
                                                                            component="button"
                                                                            onClick={() =>
                                                                                handleViewGRNSummary(spoId, deliveryId, 'deliveryDate')
                                                                            }
                                                                            sx={{ mr: 1 }}
                                                                        >
                                                                            {materialData?.delivery_date}
                                                                        </Link>
                                                                    </TableCell>
                                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                        <Box display="flex" alignItems="center">
                                                                            {materialData?.ritz_code}
                                                                            <OpenInNewIcon
                                                                                sx={{ ml: 1, color: 'rgb(25, 118, 210)', cursor: 'pointer', }}
                                                                                onClick={() =>
                                                                                    setShowMaterialDetailsModal({
                                                                                        modalStatus: true,
                                                                                        materialId: materialData?.customer_brand_material_id,
                                                                                    })
                                                                                }
                                                                            />
                                                                        </Box>
                                                                    </TableCell>
                                                                </>
                                                            )}
                                                            {batchIndex === 0 && rollIndex === 0 && (
                                                                <>
                                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                        <Link
                                                                            component="button"
                                                                            onClick={() =>
                                                                                handleViewGRNSummary(spoId, combineData.id, 'packList')}

                                                                            sx={{ mr: 1 }}
                                                                        >
                                                                            {combineData?.pack_list_name}
                                                                        </Link>
                                                                       
                                                                    </TableCell>
                                                                </>
                                                            )}
                                                            {rollIndex === 0 && (
                                                                <>
                                                                    <TableCell rowSpan={batch.rolls.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                        {batch?.batch_name}
                                                                    </TableCell>
                                                                </>
                                                            )}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                {roll?.pack_number}
                                                            </TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                {roll?.quantity} {roll?.quantity_units}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            ))}
                                        </>
                                    )}

                                </TableBody>
                            </Table>
                        </>
                    )}
                        </>
                    ):(
                        <>
                        <Table sx={{width:'50%'}} >
                                <TableHead>
                                    <TableRow sx={{ background: theme.palette.grey[100] }}>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Delivery</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Material Description</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Quantity</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Quantity Unit</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{materialData?.delivery_date}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}> 
                                            <Box display="flex" alignItems="center">
                                                {materialData?.ritz_code}
                                                    <OpenInNewIcon
                                                        sx={{ml: 1,color: 'rgb(25, 118, 210)',cursor: 'pointer',}}
                                                        onClick={() =>
                                                            setShowMaterialDetailsModal({
                                                                modalStatus: true,
                                                                materialId: materialData?.customer_brand_material_id,
                                                            })
                                                        }
                                                        />
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{combineData?.total_quantity?.quantity}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{combineData?.total_quantity?.quantity_units_display}</TableCell>
                                </TableBody>
                            </Table>
                        </>
                    )}
                </Box>
                <Box sx={{ mt: 1, mb: 2, p: 1 }}>
                    {isVisibleDebitNote && (
                        <Box sx={{ width: '50%', p: 1 }}>
                            <Typography fontSize='15px' fontWeight='bold'>Debit Note Details</Typography>
                            {combineData?.debit_note_details && Object.keys(combineData?.debit_note_details).length > 0 ? (
                                <>
                                    <Table >
                                        <TableHead>
                                            <TableRow sx={{ background: theme.palette.grey[100] }}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Debit Note</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Quantity</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Unit Price</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Value</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                    <Link
                                                        component="button"
                                                        onClick={() =>
                                                            handleClickDebitNote(
                                                                combineData?.debit_note_details?.debit_note_material_id,
                                                                combineData?.debit_note_details?.debit_note_id,
                                                            )
                                                        }
                                                        sx={{ mr: 1 }}
                                                    >
                                                        {combineData.debit_note_details?.display_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{combineData?.debit_note_details?.quantity?.quantity} {combineData.debit_note_details?.quantity?.quantity_units_display}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{combineData?.debit_note_details?.unit_price || '--'}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{combineData?.debit_note_details?.total_price || '--'}</TableCell>
                                            </TableRow>

                                        </TableBody>
                                    </Table>
                                </>

                            ) : (
                                <>
                                    <Alert severity='info' sx={{ mt: 1 }} >
                                        No availble Created Debit Note Details.
                                    </Alert>
                                </>

                            )}
                        </Box>
                    )}
                    
                    {isVisibleReplacement && (
                        <Box sx={{ width: '50%', p: 1 }}>
                            <Typography fontSize='15px' fontWeight='bold'>Replacement Date Details</Typography>
                            {combineData?.replacements_details?.length == 0 ? (
                                <>
                                    <Alert severity='info' sx={{ mt: 1 }} >
                                        No available Created Replacement Details.
                                    </Alert>
                                </>
                            ) : (
                                <>
                                    <Table >
                                        <TableHead>
                                            <TableRow sx={{ background: theme.palette.grey[100] }}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Delivery</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Replacement Date</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Replacement Quantity</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {combineData?.replacements_details?.map((replacement: any, replacementIndex: number) => (
                                                <TableRow key={replacementIndex}>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                        <Link
                                                            component="button"
                                                            onClick={() =>
                                                                handleViewGRNSummary(spoId, replacement.delivery_id, 'deliveryDate')
                                                            }
                                                            sx={{ mr: 1 }}
                                                        >
                                                            {replacement.display_number}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{replacement?.confirmed_delivery_date}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{replacement?.quantity?.quantity} {replacement?.quantity?.quantity_units_display}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </>
                            )}
                        </Box>
                    )}

                    {isVisibleCPI && (
                        <Box sx={{ width: '50%', p: 1 }}>
                            <Typography fontSize='15px' fontWeight='bold'>CPI Details</Typography>
                            {combineData?.cpi_details && Object.keys(combineData?.cpi_details).length == 0 ? (
                                <>
                                    <Alert severity='info' sx={{ mt: 1 }} >
                                        No available CPI Details.
                                    </Alert>
                                </>
                            ) : (
                                <>
                                    <Table >
                                        <TableHead>
                                            <TableRow sx={{ background: theme.palette.grey[100] }}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Debit Note</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Quantity</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Unit Price</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Value</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                    <Link
                                                        component="button"
                                                        onClick={() =>
                                                            handleClickDebitNote(
                                                                combineData?.debit_note_details?.debit_note_material_id,
                                                                combineData?.debit_note_details?.debit_note_id,
                                                            )
                                                        }
                                                        sx={{ mr: 1 }}
                                                    >
                                                        {combineData?.debit_note_details?.display_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{combineData?.cpi_details?.quantity?.quantity} {combineData.debit_note_details?.quantity?.quantity_units_display}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{combineData?.cpi_details?.unit_price || '--'}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{combineData?.cpi_details?.total_price || '--'}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </>
                            )}
                        </Box>
                    )}
                </Box>
            </>}
        </>
    );
};

export default CombineDetails;
