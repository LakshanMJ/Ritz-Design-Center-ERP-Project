import {
    Card,
    CardHeader,
    Grid,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Table,
    TableBody,
    Link, Radio, IconButton
} from "@mui/material";
import * as React from "react";
import {ReactKeyHelper} from "@/helpers/KeyHelper";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import { useEffect, useState } from "react";
import EditPackItemEMBService from "../Service/EditPackItemEMBService";
import DeletePackItemService from "../Service/DeletePackItemService";
import { ORDER_PACK_ITEM_EMB_SERVICE_TYPE } from "@/helpers/constants/Constants";
import EditPackItemWashService from "../Service/EditPackItemWashService";

const GroupedServiceCosts = ({ orderItemId, serviceCostData, supplierInquiryHeaders, showSupplierInquiries, serviceSupplierInquiryData, handleServiceSupplierSelect, colorwayId, countryId, orderId, versionId, ModalClose}: any) => {
    const serviceTypeKey = 'service_type';
    const headerKey = 'headers';
    const isAttachmentFieldKey = 'is_attachment';
    const attachmentFieldKey = 'attachment_field_name';
    const empServiceKey = 'Embellishment Service';
    const washServiceKey = 'Wash Service';

    const filePathKey = 'file_path';
    const displaNameKey = 'display_name';


    const keyHelper = new ReactKeyHelper();

    const getSupplierInquiryDetails = (dataRow: any) => {
        let supplierInquiries = dataRow?.['supplier_inquiry_details'] || [];

        if (supplierInquiries.length == 0) {
            supplierInquiries = [{}];
        }
        return supplierInquiries;

    }
    const [openEmbModal, setOpenEmbModal] = useState(false);
    const [openWashModal, setWashModal] = useState(false);
    const [openEmbDeleteModal, setOpenEmbDeleteModal] = useState(false);
    const [selectedEmbDetailId, setSelectedEmbDetailId] =  useState({});
    const [selectedEmbServiceId, setSelectedEmbServiceId] =  useState({});
    const [selectedWashServiceId, setSelectedWashServiceId] =  useState({});
    const [selectedServiceType, setSelectedServiceType] =  useState({});
    
    const handleOpenEMBPackItemModal = (isOpen: any,embDetailId:any) => {
        setOpenEmbModal(true);
        setSelectedEmbDetailId(embDetailId);
    }
    const handleOpenWashServiceModal = (isOpen: any,washServiceId:any) => {
        setWashModal(true);
        setSelectedWashServiceId(washServiceId);
    }
    const handleOpenDeleteEMBPackItemModal = (isOpen: any,serviceId:any, serviceType:any) => {
        setOpenEmbDeleteModal(true);
        setSelectedEmbServiceId(serviceId);
        setSelectedServiceType(serviceType)
    }
    const closeModalHandler = () => {
        setOpenEmbModal(false)
        setWashModal(false)
        setOpenEmbDeleteModal(false)
        ModalClose(true)
    }
    return (
        <>
         {
                openWashModal && <EditPackItemWashService
                    colorwayId={colorwayId}
                    itemId={orderItemId}
                    countryId={countryId}
                    orderId={orderId}
                    versionId={versionId}
                    packItemWashId={selectedWashServiceId}
                    setModalOpen={setWashModal}
                    modalOpen={openWashModal}
                    setUpdated={closeModalHandler}       
                    packItemId={orderItemId}
                />
            }
         {
                openEmbModal && <EditPackItemEMBService
                    colorwayId={colorwayId}
                    itemId={orderItemId}
                    countryId={countryId}
                    orderId={orderId}
                    versionId={versionId}
                    packItemEMBId={selectedEmbDetailId}
                    setModalOpen={setOpenEmbModal}
                    modalOpen={openEmbModal}
                    setUpdated={closeModalHandler}
                />
            }
            {
                openEmbDeleteModal && <DeletePackItemService
                    orderId={orderId}
                    versionId={versionId}
                    serviceId={selectedEmbServiceId}
                    serviceType={selectedServiceType}
                    setModalOpen={setOpenEmbDeleteModal}
                    modalOpen={openEmbDeleteModal}
                    setUpdated={closeModalHandler}
                />
            }
            

            {
                serviceCostData.map((serviceCost: any) => (
                    serviceCost?.[orderItemId]?.['data']?.length &&
                        <Grid container columnSpacing={3} direction={'row'} key={keyHelper.getNextKeyValue()}>
                            <Grid item md={12} xs={12} sx={{width: '100%'}}>
                                <Card key={`${keyHelper.getNextKeyValue()}`} sx={{mb: 3}} variant='outlined'>
                                    <CardHeader
                                        title={serviceCost[serviceTypeKey]}
                                        sx={{
                                            background: (theme) => theme.palette.grey[100],
                                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                                        }}
                                    />

                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    {!showSupplierInquiries && <TableCell></TableCell>}
                                                    <TableCell>Size</TableCell>
                                                    {
                                                        serviceCost?.[headerKey]?.map((serviceHeader: any) => (
                                                            <TableCell key={`${keyHelper.getNextKeyValue()}`}>{serviceHeader['label']}</TableCell>
                                                        ))
                                                    }
                                                    {
                                                        showSupplierInquiries && <TableCell>Select</TableCell>
                                                    }
                                                    {
                                                        showSupplierInquiries && supplierInquiryHeaders?.map((supplierInquiryHeader: any) => (
                                                            <TableCell key={`${keyHelper.getNextKeyValue()}`}>{supplierInquiryHeader['label']}</TableCell>
                                                        ))
                                                    }
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>


                                                { ! showSupplierInquiries &&
                                                    serviceCost?.[orderItemId]?.['data']?.map((serviceCostData: any) => (

                                                        <TableRow key={keyHelper.getNextKeyValue()}>
                                                            <TableCell>
                                                                <IconButton size='small' color='primary'  onClick={() => { handleOpenDeleteEMBPackItemModal(true,serviceCostData.service_id, serviceCost.service_type)}}>
                                                                     <DeleteForeverIcon style={{ color: '#d32f2f' }} fontSize='inherit' />
                                                                </IconButton>
                                                                {
                                                                    serviceCost.service_type == empServiceKey ? (
                                                                        <IconButton
                                                                            size='small'
                                                                            color='primary'
                                                                            onClick={() => { handleOpenEMBPackItemModal(true, serviceCostData.embellishment_detail_id) }}
                                                                        >
                                                                            <BorderColorIcon fontSize='inherit' />
                                                                        </IconButton>
                                                                    ) : (
                                                                        <IconButton
                                                                            size='small'
                                                                            color='primary'
                                                                            onClick={() => { handleOpenWashServiceModal(true, serviceCostData.service_id ) }}
                                                                        >
                                                                            <BorderColorIcon fontSize='inherit' />
                                                                        </IconButton>
                                                                    )
                                                                }                                                            
                                                            
                                                            </TableCell>
                                                            <TableCell>{serviceCostData?.['pack_size_name']}</TableCell>
                                                            {
                                                                serviceCost?.[headerKey]?.map((serviceHeader: any, index: number) => (
                                                                    <TableCell key={`${keyHelper.getNextKeyValue()}`}>

                                                                        {
                                                                            serviceHeader?.[isAttachmentFieldKey] ? (

                                                                                <Link href={serviceCostData?.[serviceHeader?.[attachmentFieldKey]]?.[filePathKey]} target="_blank">
                                                                                    {serviceCostData?.[serviceHeader?.[attachmentFieldKey]]?.[displaNameKey]}
                                                                                </Link>
                                                                            ): (
                                                                                serviceCostData?.[serviceHeader['name']]
                                                                            )
                                                                        }
                                                                    </TableCell>

                                                                    ))
                                                            }
                                                        </TableRow>
                                                    ))
                                                }


                                                { showSupplierInquiries &&
                                                    serviceCost?.[orderItemId]?.['data']?.map((serviceCostData: any) => (
                                                        getSupplierInquiryDetails(serviceCostData).map((supplierInquiryDetail: any, index: number) => (
                                                            <TableRow key={keyHelper.getNextKeyValue()}>
                                                            {index == 0 && <TableCell>{serviceCostData?.['pack_size_name']}</TableCell>}
                                                            { index == 0 ? (
                                                                serviceCost?.[headerKey]?.map((serviceHeader: any, index: number) => (
                                                                    <TableCell key={`${keyHelper.getNextKeyValue()}`}>

                                                                        {
                                                                            serviceHeader?.[isAttachmentFieldKey] ? (

                                                                                <Link href={serviceCostData?.[serviceHeader?.[attachmentFieldKey]]?.[filePathKey]} target="_blank">
                                                                                    {serviceCostData?.[serviceHeader?.[attachmentFieldKey]]?.[displaNameKey]}
                                                                                </Link>
                                                                            ): (
                                                                                <>
                                                                                    {
                                                                                        serviceCostData?.[serviceHeader['name']]

                                                                                    }

                                                                                </>
                                                                            )
                                                                        }
                                                                    </TableCell>

                                                                    ))
                                                                ) : (
                                                                    <TableCell colSpan={serviceCost?.[headerKey].length + 1}></TableCell>
                                                                )
                                                            }
                                                                {
                                                                    serviceCostData?.['supplier_inquiry_details']?.length > 0 ? (
                                                                        <TableCell>
                                                                            <Radio
                                                                            checked={serviceSupplierInquiryData?.[supplierInquiryDetail?.['pack_item_service_id']] == supplierInquiryDetail?.['supplier_inquiry_detail_id']}
                                                                            onClick={() => handleServiceSupplierSelect(supplierInquiryDetail?.['pack_item_service_id'] , supplierInquiryDetail?.['supplier_inquiry_detail_id'])}
                                                                            name="radio-buttons"
                                                                            inputProps={{'aria-label': 'A'}} />
                                                                        </TableCell>

                                                                ): (
                                                                    <TableCell>--</TableCell>
                                                                    )
                                                                }
                                                                {
                                                                    supplierInquiryHeaders.map((supplierInquiryHeader: any) => (
                                                                        <TableCell key={`${keyHelper.getNextKeyValue()}`}>
                                                                            {supplierInquiryDetail?.[supplierInquiryHeader?.name] || "--"}
                                                                        </TableCell>

                                                                    ))
                                                                }
                                                        </TableRow>

                                                    ))

                                                    ))
                                                }
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Card>
                            </Grid>
                        </Grid>

                ))
            }
        </>
    )

}

export default GroupedServiceCosts;