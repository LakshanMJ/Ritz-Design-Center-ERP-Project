import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Box, IconButton, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, useTheme } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { getClubSupplierPODetailsURL, spoLeftoverDetails } from "@/helpers/constants/rest_urls/SupplierPoUrls";
import { cISummaryReportURL, createdGrnDetailsPageURL, grnSummaryReportURL } from "@/helpers/constants/front_end/GrnUrls";
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import RitzModal from "@/components/Ritz/RitzModal";
import DDQDetails from "@/views/grn/DDQDetails";
import DDQIDetails from "@/views/grn/DDQI Details";
import EditIcon from '@mui/icons-material/Edit';
import AttachmentDetails from "./AttachmentDetails";
import NextLink from 'next/link';
import MaterialDetails from "./MaterialDetails";
import ProformaInvoiceDetails from "./ProformaInvoiceDetails";
import CircularLoader from "@/components/CircularLoader";
import TableViewIcon from '@mui/icons-material/TableView';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import SPOLeftoverDetails from "./SPOLeftoverDetails";
import SPODeliveryFOCDetails from "./SPODeliveryFOCDetails";

const SPOSummary = ({ sourceId , type }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(true);
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [modalStates, setModalStates] = useState({
        isOpenMaterial: false,
        isOpenAttachment: false,
        isOpenProfomaInv: false,
        isOpenLeftOverDetails: false,
        isOpenFOCDetails: false,
    });
    const [selectedLeftoverMaterialDetails, setSelectedLeftoverMaterialDetails] = useState<any>([]);
    const [selectedSPOId, setSelectedSPOId] = useState(null);
    const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
    const [selectedModalType, setSelectedModalType] = useState(null);
    const [selectedMaterialData, setSelectedMaterialData] = useState<any>([]);
    const [supplierPoData, setSupplierPoData] = useState<any>([]);
    const [leftoverDetails, setLeftoverDetails] = useState<any>([]);
    const [selectedDeliveryData, setSelectedDeliveryData] = useState<any>({});

    const fetchData = () => {
        const requests = [
            api.get(getClubSupplierPODetailsURL(sourceId, type )),
            api.get(spoLeftoverDetails(sourceId, type)),
        ]
        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [spoDetails, spoLeftoverDetails] = respData;
            setSupplierPoData([...spoDetails]);
            setLeftoverDetails([...spoLeftoverDetails]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    };

    const handleViewGRNSummary = (spoId: any, reportId: any, reportType: any) => {
        const url = grnSummaryReportURL(spoId, reportId, reportType, sourceId, type);
        window.open(url, '_blank');
    };
    const handleOpenDDQDDQImodal = (spoId: any, modalType: any, deliveryId: any) => {
        setIsOpenModal(true)
        setSelectedSPOId(spoId)
        setSelectedModalType(modalType)
        setSelectedDeliveryId(deliveryId)
    };
    const handleViewProfomaInvoice = (spoId: any) => {
        setModalStates((prev) => ({
            ...prev,
            isOpenProfomaInv: true,

        }));
        setSelectedSPOId(spoId)
    };
    
    const onDeleteModalClose = () => {
        setIsOpenModal(false)
        setModalStates((prev) => ({
            ...prev,
            isOpenMaterial: false,

        }));
    }
    const handleModalClose = () => {
        setModalStates((prev) => ({
            ...prev,
            isOpenAttachment: false,
            isOpenProfomaInv:false,
        }));
    }
    const handleAttachmentsModal = (deliveryData: any, spoId: any) => {
        setModalStates((prev) => ({
            ...prev,
            isOpenAttachment: true,
        }));
        setSelectedDeliveryData(deliveryData)
        setSelectedSPOId(spoId)
    };
    const handleMaterialCategoryClick = (materialData: any) => {
        setModalStates((prev) => ({
            ...prev,
            isOpenMaterial: true,
        }));
        setSelectedMaterialData([...materialData])

    };
    const calculateRowSpan = (deliveryNoteSet: any) => {
        let totalLength = 0;

        deliveryNoteSet?.forEach((deliveryNote: any) => {
            totalLength += deliveryNote?.pack_list.length;
        });
        return totalLength > 0 ? totalLength : totalLength + 1;
    }
    const handleSavedData = (status: any) => {
        if(status){
            fetchData();
            setModalStates((prev) => ({
                ...prev,
                isOpenProfomaInv:false,
            }));
        }
    };
    const handleSavedAttachmentData = (status: any) => {
        if(status){
            fetchData();
            setModalStates((prev) => ({
                ...prev,
                isOpenAttachment: false,
            }));
        }
    };

    const handleViewCISummary = (spoId: any, invoiceId: any) => {
         const url = cISummaryReportURL(spoId, invoiceId, sourceId, type);
         window.open(url, '_blank');
    };

    const handleViewLeftOverDetails = (leftoverMaterials: any) => {
        setSelectedLeftoverMaterialDetails([])
        setModalStates((prev) => ({
            ...prev,
            isOpenLeftOverDetails: true,
        }));
        setSelectedLeftoverMaterialDetails([...leftoverMaterials])  
    }
       
    const handleSetFOCDetails = (deliveryId: any) =>{
        setSelectedDeliveryId(deliveryId)
        setModalStates((prev) => ({
            ...prev,
            isOpenFOCDetails: true,
        }));
    }
    useEffect(() => {
        if (sourceId) {
            fetchData();
        }
    }, [sourceId]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                {isOpenModal && (
                    <RitzModal
                        open={isOpenModal}
                        onClose={onDeleteModalClose}
                        maxWidth='xl'
                        title='DDQDetails'
                    >
                        {selectedModalType == 'ddq' ? (
                            <DDQDetails supplierPoId={selectedSPOId} selectedDeliveryId={selectedDeliveryId} />
                        ) : (
                            <DDQIDetails supplierPoId={selectedSPOId} selectedDeliveryId={selectedDeliveryId} />
                        )}
                    </RitzModal>)
                }
                {modalStates?.isOpenMaterial && (
                    <RitzModal
                        open={modalStates?.isOpenMaterial}
                        onClose={onDeleteModalClose}
                        maxWidth='md'
                        title='Material Details'
                    >
                        <MaterialDetails materialData={selectedMaterialData} />
                    </RitzModal>)
                }
                {modalStates?.isOpenAttachment && (
                    <RitzModal
                        open={modalStates?.isOpenAttachment}
                        onClose={handleModalClose}
                        maxWidth='md'
                        title='Delivery Details'
                    >
                        <AttachmentDetails spoId={selectedSPOId} deliveryData={selectedDeliveryData.id} savedStatus={handleSavedAttachmentData} />
                    </RitzModal>)
                }
                {modalStates?.isOpenProfomaInv && (
                    <RitzModal
                        open={modalStates?.isOpenProfomaInv}
                        onClose={handleModalClose}
                        maxWidth={false}
                        fullWidth={true}
                        title='Add Proforma Invoice'
                    >
                        <ProformaInvoiceDetails spoId={selectedSPOId} savedStatus={handleSavedData} type={type}/>
                    </RitzModal>)
                }
                {modalStates?.isOpenLeftOverDetails && (
                    <RitzModal
                        open={modalStates?.isOpenLeftOverDetails}
                        onClose={()=>{setModalStates((prev) => ({
                            ...prev,
                            isOpenLeftOverDetails: false,
                        }))}}
                        maxWidth='lg'
                        title='Leftover Details'
                    >
                        <SPOLeftoverDetails dataList={selectedLeftoverMaterialDetails}/>
                    </RitzModal>)
                }
                {modalStates?.isOpenFOCDetails && (
                    <RitzModal
                        open={modalStates?.isOpenFOCDetails}
                        onClose={()=>{ setModalStates((prev) => ({
                            ...prev,
                            isOpenFOCDetails: false,
                        }));}}
                        maxWidth='lg'
                        title='FOC Details'
                    >
                        <SPODeliveryFOCDetails deliveryId={selectedDeliveryId}/>
                    </RitzModal>)
                }

                {isLoading && (<CircularLoader />)}    
                
                <TableContainer component={Paper}>
                    <Table >
                        <TableHead>
                            <TableRow sx={{ background: theme.palette.grey[100] }}>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Supplier PO</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Supplier</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Material</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Proforma Invoice</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>DDQ</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>DDQI</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Commercial Invoice</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Delivery Note</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Pack List</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>GRN Summary</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody >
                            {leftoverDetails?.length != 0 && (
                                <React.Fragment >
                                    {leftoverDetails?.map((leftOver: any, leftOverIndex: any) => (
                                        <TableRow key={leftOverIndex}>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px' }}>{leftOver?.supplier_po_number} (Leftover)</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px' }}>{leftOver?.supplier_name || 'N/A'}</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px' }}>
                                                {leftOver.materials.map((material: any, materialIndex: any) => (
                                                    <React.Fragment key={materialIndex}>
                                                        <Box style={{ color: '#1976d2', cursor: 'pointer' }}
                                                            onMouseEnter={(e: any) => e.target.style.textDecoration = 'underline'}
                                                            onMouseLeave={(e: any) => e.target.style.textDecoration = 'none'} onClick={() => handleMaterialCategoryClick(material.materials)}>
                                                            {material.material_category}
                                                        </Box>
                                                        {materialIndex < leftOver.materials.length - 1 && ' / '}
                                                    </React.Fragment>
                                                ))}
                                            </TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px', textAlign: 'center' }}>{"--"}</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px', textAlign: 'center' }}>{"--"}</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px', textAlign: 'center' }}>{"--"}</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px', textAlign: 'center' }}>{"--"}</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px', textAlign: 'center' }}>{"--"}</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px', textAlign: 'center' }}>{"--"}</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px', textAlign: 'center' }}>
                                                <Tooltip title="Leftover Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewLeftOverDetails(leftOver.leftover_materials)}
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        <VisibilityIcon color='primary' />
                                                    </IconButton>
                                                </Tooltip></TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            )}
                            {supplierPoData.map((supplierPo: any, supplierPoIndex: any) => (
                                <React.Fragment key={supplierPoIndex}>
                                    <TableRow key={supplierPoIndex}>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px' }}>{supplierPo.supplier_po_number}</TableCell>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px' }}>{supplierPo.supplier_name}</TableCell>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px' }}>
                                            {supplierPo.materials.map((material: any, materialIndex: any) => (
                                                <React.Fragment key={materialIndex}>
                                                    <Box sx={{ color: '#1976d2', cursor: 'pointer', display: 'inline'}}
                                                        onMouseEnter={(e: any) => e.target.style.textDecoration = 'underline'}
                                                        onMouseLeave={(e: any) => e.target.style.textDecoration = 'none'} onClick={() => handleMaterialCategoryClick(material.materials)}>
                                                        {material.material_category}
                                                    </Box>
                                                    {materialIndex < supplierPo.materials.length - 1 && ' / '}
                                                </React.Fragment>
                                            ))}
                                        </TableCell>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '100px', }}>
                                            <Box sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between', 
                                                alignItems: 'center',
                                            }}>
                                                {supplierPo?.proforma_invoice_supplier_display_number|| '--'}
                                                <Tooltip title="Attachments">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewProfomaInvoice(supplierPo.id)}
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        <EditIcon color='primary' />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '100px' }}>DDQ
                                            <Tooltip title="DDQ Details">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenDDQDDQImodal(supplierPo.id, 'ddq', null)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <ArrowOutwardIcon color='primary' />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '100px' }}>DDQI
                                            <Tooltip title="DDQI Details">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenDDQDDQImodal(supplierPo.id, 'ddqi', null)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <ArrowOutwardIcon color='primary' />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                       
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px' }}>
                                            {supplierPo?.delivery_dates?.filter((date: any) => date.supplier_po_delivery_invoice)?.map((date: any, index: any, arrayData: any) => (
                                                    <React.Fragment key={index}>
                                                        <Link component={NextLink} href={date.supplier_po_delivery_invoice?.invoice?.file_path || '#'}>
                                                            {date.supplier_po_delivery_invoice?.display_number}
                                                        </Link>
                                                        {index !== arrayData.length - 1 && ', '}
                                                    </React.Fragment>
                                                ))}
                                        </TableCell>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px' }}>
                                            {supplierPo?.delivery_dates?.filter((date: any) => date.supplier_po_delivery_invoice).map((date: any, index: any, deliveryData: any) => (
                                                    <React.Fragment key={index}>
                                                        {date.supplier_po_delivery_invoice.supplierpoinvoicedeliverynote_set.map(
                                                            (note: any, noteIndex: any, inoviceDeliveryNoteData: any) => (
                                                                <React.Fragment key={noteIndex}>
                                                                    <Link component={NextLink} href={note.delivery_note?.file_path || '#'}>
                                                                        {note.display_number}
                                                                    </Link>
                                                                    {noteIndex !== inoviceDeliveryNoteData.length - 1 && ', '}
                                                                </React.Fragment>
                                                            )
                                                        )}
                                                        {index !== deliveryData.length - 1 && ', '}
                                                    </React.Fragment>
                                                ))}
                                        </TableCell>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px' }}>
                                            {supplierPo?.delivery_dates?.filter((date: any) => date.supplier_po_delivery_invoice).map((date: any, index: any) => (
                                                    <React.Fragment key={index}>
                                                        {date.supplier_po_delivery_invoice.supplierpoinvoicedeliverynote_set.map((note: any, noteIndex: any) => (
                                                            <React.Fragment key={noteIndex}>
                                                                {note.pack_list?.map((packItem: any, packIndex: any) => (
                                                                    <React.Fragment key={packIndex}>
                                                                        <Link component={NextLink} href={packItem.pack_list?.file_path || '#'}>
                                                                            {packItem.display_number}
                                                                        </Link>
                                                                    </React.Fragment>
                                                                ))}
                                                            </React.Fragment>
                                                        ))}
                                                        {index !== supplierPo.delivery_dates.filter((date: any) => date.supplier_po_delivery_invoice).length - 1 && ', '}
                                                    </React.Fragment>
                                                ))}
                                        </TableCell>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '50px', textAlign: 'center' }}>
                                            <Tooltip title="GRN Summary">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleViewGRNSummary(supplierPo.id, supplierPo.id, 'spo')}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <VisibilityIcon color='primary' />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                    {supplierPo.delivery_dates.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={10} align="center">
                                                No delivery dates available
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {supplierPo.delivery_dates.map((deliveryDate: any, deliveryDateIndex: any) => (
                                        <React.Fragment key={deliveryDateIndex}>
                                            {deliveryDate.supplier_po_delivery_invoice && deliveryDate.supplier_po_delivery_invoice.supplierpoinvoicedeliverynote_set ? (
                                                deliveryDate.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set && deliveryDate.supplier_po_delivery_invoice.supplierpoinvoicedeliverynote_set.map((deliveryNote: any, deliveryNoteIndex: any) => (
                                                    <React.Fragment key={`${deliveryDateIndex}-${deliveryNoteIndex}`}>
                                                        {deliveryNote.pack_list && deliveryNote.pack_list.map((packItem: any, packIndex: any) => (
                                                            <TableRow key={`${deliveryDateIndex}-${deliveryNoteIndex}-${packIndex}`}>
                                                                {deliveryNoteIndex === 0 && packIndex === 0 && (
                                                                    <>
                                                                        <TableCell rowSpan={calculateRowSpan(deliveryDate.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set)} colSpan={3} align="right" >
                                                                            {deliveryDate.delivery_display} ({deliveryDate.confirmed_delivery_date || '--'})
                                                                            <Tooltip title="GRN Details Delivery Wise">
                                                                                <IconButton
                                                                                    size="small"
                                                                                    onClick={() => handleViewGRNSummary(supplierPo.id, deliveryDate.id, 'deliveryDate')}
                                                                                    style={{ cursor: "pointer" }}
                                                                                >
                                                                                    <FullscreenIcon color='primary' />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                            <Tooltip title="Attachments">
                                                                                <IconButton
                                                                                    size="small"
                                                                                    onClick={() => handleAttachmentsModal(deliveryDate, supplierPo.id)}
                                                                                    style={{ cursor: "pointer" }}
                                                                                >
                                                                                    <EditIcon color='primary' />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </TableCell>
                                                                        <TableCell rowSpan={calculateRowSpan(deliveryDate.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set)} colSpan={1} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }} align="center">
                                                                            {deliveryDate?.is_foc && (
                                                                               <Button sx={{ borderRadius: '16px'}} variant="outlined" onClick={() => {handleSetFOCDetails(deliveryDate?.id)}} size={'small'} ><MoneyOffIcon sx={{ mr: 1 }} />FOC</Button>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell rowSpan={calculateRowSpan(deliveryDate.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set)} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>DDQ
                                                                            <Tooltip title="DDQ Details">
                                                                                <IconButton
                                                                                    size="small"
                                                                                    onClick={() => handleOpenDDQDDQImodal(supplierPo.id, 'ddq', deliveryDate.id)}
                                                                                    style={{ cursor: "pointer" }}
                                                                                >
                                                                                    <ArrowOutwardIcon color='primary' />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </TableCell>
                                                                        <TableCell rowSpan={calculateRowSpan(deliveryDate.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set)} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>DDQI
                                                                            <Tooltip title="DDQI Details">
                                                                                <IconButton
                                                                                    size="small"
                                                                                    onClick={() => handleOpenDDQDDQImodal(supplierPo.id, 'ddqi', deliveryDate.id)}
                                                                                    style={{ cursor: "pointer" }}
                                                                                >
                                                                                    <ArrowOutwardIcon color='primary' />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </TableCell>
                                                                        
                                                                        <TableCell rowSpan={calculateRowSpan(deliveryDate.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set)} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                            <Box sx={{
                                                                                display: 'flex',
                                                                                justifyContent: 'space-between',
                                                                                alignItems: 'center',
                                                                            }}>
                                                                                <Link component={NextLink} href={deliveryDate.supplier_po_delivery_invoice?.invoice?.file_path || '#'}>{deliveryDate.supplier_po_delivery_invoice?.display_number}</Link>
                                                                                {deliveryDate.supplier_po_delivery_invoice && (
                                                                                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> {/* Additional Box to group the tooltips */}
                                                                                   <Tooltip title="GRN Details Delivery Wise">
                                                                                       <IconButton onClick={() => handleViewGRNSummary(supplierPo.id, deliveryDate.supplier_po_delivery_invoice.id, 'invoice')} size="small" sx={{ cursor: "pointer" }}>
                                                                                           <FullscreenIcon color='primary' />
                                                                                       </IconButton>
                                                                                   </Tooltip>
                                                                                   <Tooltip title="CI Summary">
                                                                                       <IconButton onClick={() => handleViewCISummary(supplierPo?.id, deliveryDate.supplier_po_delivery_invoice.id)} size="small" sx={{ cursor: "pointer" }}>
                                                                                           <TableViewIcon color='primary' />
                                                                                       </IconButton>
                                                                                   </Tooltip>
                                                                               </Box>
                                                                                )}

                                                                            </Box>
                                                                        </TableCell>
                                                                    </>
                                                                )}
                                                                {packIndex === 0 && (
                                                                    <TableCell rowSpan={deliveryNote.pack_list.length} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                        <Box sx={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                        }}>
                                                                            <Link component={NextLink} href={deliveryNote.delivery_note?.file_path || '#'}>{deliveryNote.display_number}</Link>
                                                                            <Tooltip title="GRN Details Delivery Wise">
                                                                                <IconButton onClick={() => handleViewGRNSummary(supplierPo.id, deliveryNote.id, 'delivery')} size="small" style={{ cursor: "pointer", float: 'right' }}>
                                                                                    <FullscreenIcon color='primary' />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </Box>
                                                                    </TableCell>
                                                                )}
                                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                    <Box sx={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                    }}>
                                                                        <Link component={NextLink} href={packItem.pack_list?.file_path || '#'}>{packItem.display_number}</Link>
                                                                        <Tooltip title="GRN Details Delivery Wise">
                                                                            <IconButton onClick={() => handleViewGRNSummary(supplierPo.id, packItem.id, 'packList')} size="small" style={{ cursor: "pointer", float: 'right' }}>
                                                                                <FullscreenIcon color='primary' />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                    {packItem.grns && packItem.grns.map((grn: any, grnIndex: any) => (
                                                                        <React.Fragment key={packIndex}>
                                                                            <Link sx={{ cursor: 'pointer' }} href={createdGrnDetailsPageURL(grn.id)} target="_blank">
                                                                                {grn.display_number}
                                                                            </Link>
                                                                            {grnIndex !== packItem.grns.length - 1 && ', '}
                                                                        </React.Fragment>
                                                                    ))}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </React.Fragment>
                                                ))
                                            ) : (
                                                <TableRow key={`empty-${deliveryDateIndex}`}>
                                                        <TableCell
                                                            rowSpan={calculateRowSpan(deliveryDate.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set)}
                                                            colSpan={3}
                                                            align="right"
                                                        >
                                                            {deliveryDate.delivery_display} ({deliveryDate.confirmed_delivery_date || '--'})
                                                            <Tooltip title="GRN Details CI Wise">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleViewGRNSummary(supplierPo.id, deliveryDate.id, 'deliveryDate')}
                                                                    style={{ cursor: "pointer" }}
                                                                >
                                                                    <FullscreenIcon color="primary" />
                                                                </IconButton>
                                                            </Tooltip>

                                                            <Tooltip title="Attachments">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleAttachmentsModal(deliveryDate, supplierPo.id)}
                                                                    style={{ cursor: "pointer" }}
                                                                >
                                                                    <EditIcon color="primary" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell rowSpan={calculateRowSpan(deliveryDate.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set)} colSpan={1} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }} align="center">
                                                            {deliveryDate?.is_foc && (
                                                                <Button
                                                                    sx={{ borderRadius: '16px', ml: deliveryDate?.foc ? 2 : 0 }}
                                                                    variant="outlined"
                                                                    onClick={() => { handleSetFOCDetails(deliveryDate?.id) }}
                                                                    size="small"
                                                                >
                                                                    <MoneyOffIcon sx={{ mr: 1 }} />FOC
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    <TableCell rowSpan={calculateRowSpan(deliveryDate.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set)} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>DDQ
                                                        <Tooltip title="DDQ Details">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenDDQDDQImodal(supplierPo.id, 'ddq', deliveryDate.id)}
                                                                style={{ cursor: "pointer" }}
                                                            >
                                                                <ArrowOutwardIcon color='primary' />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell rowSpan={calculateRowSpan(deliveryDate.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set)} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>DDQI
                                                        <Tooltip title="DDQI Details">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenDDQDDQImodal(supplierPo.id, 'ddqi', deliveryDate.id)}
                                                                style={{ cursor: "pointer" }}
                                                            >
                                                                <ArrowOutwardIcon color='primary' />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell rowSpan={calculateRowSpan(deliveryDate.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set)} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}></TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>}
        </>
    );
};

export default SPOSummary;
