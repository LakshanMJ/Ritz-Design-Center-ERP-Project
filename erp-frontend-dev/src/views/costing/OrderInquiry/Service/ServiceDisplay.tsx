import React, { useEffect, useRef, useState } from 'react'
import {
    DEFAULT_SUCCESS, ORDER_PACK_ITEM_EMB_SERVICE_TYPE,
    ORDER_PACK_ITEM_WASH_SERVICE_TYPE
} from '@/helpers/constants/Constants';
import {
    Button,
    Card,
    CardHeader, Link, Radio,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import EditPackItemEMBService from "@/views/costing/OrderInquiry/Service/EditPackItemEMBService";
import EditPackItemWashService from "@/views/costing/OrderInquiry/Service/EditPackItemWashService";
import { IconButton } from "@mui/material";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import DeletePackItemService from './DeletePackItemService';
import {ReactKeyHelper} from "@/helpers/KeyHelper";
import RitzRadio from "@/components/Ritz/RitzRadio";
import BorderColorIcon from '@mui/icons-material/BorderColor';

const DisplayCostingServiceData = ({colorwayId, itemId, countryId, serviceData, orderId, versionId, packItemId, closeModalHandler, openServiceNewForm,
                                       showSupplierInquiries=false, selectedServiceSupplier, handleSupplierSelect, readOnly, itemServiceCosts}: any) => {

            
    const serviceTypeKey = 'serviceType';
    const isAttachmentFieldKey = 'is_attachment_field';
    const embServiceType = ORDER_PACK_ITEM_EMB_SERVICE_TYPE;
    const washServiceType = ORDER_PACK_ITEM_WASH_SERVICE_TYPE;
    const keyHelper = new ReactKeyHelper();
    const embServiceColumns = [
        {label: 'Type', name: 'type'},
        {label: 'Size', name: 'size'},
        {label: 'Embroidery Details', name: 'embellishment_attachment',
            [isAttachmentFieldKey]: true, },
    ];

    const washServiceColumns = [
        {label: 'Technique', name: 'technique'},
    ];


    const serviceTypes = [
        {
            dataKey: ORDER_PACK_ITEM_EMB_SERVICE_TYPE,
            tableColumns: embServiceColumns,
            cardTitle: "EMB Service Details"
        },
        {
            dataKey: ORDER_PACK_ITEM_WASH_SERVICE_TYPE,
            tableColumns: washServiceColumns,
            cardTitle: "Wash Service Details"
        },
    ];

    const [serviceModalProps, setServiceModalProps] = useState<any>({});
    const [serviceDeleteModalProps, setServiceDeleteModalProps] = useState<any>({});
    const [openServiceModal, setOpenServiceModal] = useState({});
    const [openServiceDeleteModal, setOpenServiceDeleteModal] = useState(false);

    useEffect(() => {
        if (openServiceNewForm?.['open']) {
            handleServiceModal(openServiceNewForm?.['serviceType'], undefined, undefined);
            openServiceNewForm = undefined;
        }
    }, [openServiceNewForm]);


    const handleServiceModal = (serviceType: any, serviceObjectId: any, serviceDataRow: any) => {
        let props = {
            [serviceTypeKey]: serviceType,
            orderId: orderId,
            packItemId: packItemId,
            versionId: versionId,
            objectId: serviceObjectId,
        }

        if (serviceType == embServiceType && serviceDataRow) {
            props['packItemEMBId'] = serviceDataRow?.['embellishment_detail'];
        }

        setServiceModalProps(props);
        setOpenServiceModal(true);
    }

    const handleServiceDeleteModal = (serviceType: any, serviceObjectId: any) => {
        const props = {
            [serviceTypeKey]: serviceType,
            orderId: orderId,
            packItemId: packItemId,
            versionId: versionId,
            objectId: serviceObjectId,
        }
        setServiceDeleteModalProps(props);
        setOpenServiceDeleteModal(true);
    }


    const getHeadersWithoutSupplierInquiries = (serviceType: any) => {
        const headers = serviceType?.tableColumns.map((tableColumn: any) => (
            <TableCell key={keyHelper.getNextKeyValue()}>
                {tableColumn.label}
            </TableCell>
        ));
        return headers;
    }

    const getHeadersWithSupplierInquiries = (serviceType: any) => {
        const supplierInquiryHeaders = serviceData?.[serviceType.dataKey]?.['supplier_inquiry_headers'] || [];

        const allHeaders = [...serviceType?.tableColumns, {label: 'Select'}, ...supplierInquiryHeaders]
        const headers = allHeaders?.map((tableColumn: any) => (
                <TableCell key={keyHelper.getNextKeyValue()}>
                    {tableColumn.label}
                </TableCell>
        ));
        return headers;

    }

    const getDisplayCellValue = (serviceDataRow: any, tableColumn: any) => {
        const value = tableColumn?.[isAttachmentFieldKey] ? (
            <TableCell key={keyHelper.getNextKeyValue()}>
                { serviceDataRow?.[tableColumn.name]?.['display_name'] ? (
                    <Link href={`${serviceDataRow?.[tableColumn.name]?.['file_path']}`} target="_blank">
                        {serviceDataRow?.[tableColumn.name]?.['display_name'] || '--'}
                    </Link>
                    ) : (
                        <>--</>
                    )}
            </TableCell>
        ) : (
            <TableCell key={keyHelper.getNextKeyValue()}>
                {serviceDataRow?.[tableColumn.name] || '--'}
            </TableCell>
        )
        return value

    }
    const getEditDeleteLinks = (serviceType: any, serviceDataRow: any) => {
        return (
            !readOnly &&
                <TableCell>
                    <IconButton size='small' color='primary' onClick={() => handleServiceDeleteModal(serviceType.dataKey, serviceDataRow?.['id'])}>
                        <DeleteForeverIcon style={{ color: '#d32f2f' }} fontSize='inherit' />
                    </IconButton>
                    <IconButton size='small' color='primary' onClick={() => handleServiceModal(serviceType.dataKey, serviceDataRow?.['id'], serviceDataRow)} >
                        <BorderColorIcon fontSize='inherit' />
                    </IconButton>
                </TableCell>
            )
    }
    const getValuesWithoutSupplierInquiries = (serviceType: any) => {

        const values = serviceData?.[serviceType.dataKey]?.['data']?.map((serviceDataRow: any) => (
            <TableRow key={keyHelper.getNextKeyValue()}>
                {getEditDeleteLinks(serviceType, serviceDataRow)}
                {
                    serviceType?.tableColumns.map((tableColumn: any) => (
                        getDisplayCellValue(serviceDataRow, tableColumn)
                    ))
                }

            </TableRow>
        ))
        return values;
    }
    const getValuesWithSupplierInquiries = (serviceType: any) => {
        const supplierInquiryHeaders = serviceData?.[serviceType.dataKey]?.['supplier_inquiry_headers'] || [];

        const displayData = serviceData?.[serviceType.dataKey]?.['data']?.map((serviceDataRow: any) => (

            serviceDataRow?.['supplier_inquiry_details']?.length == 0 ? (
                <TableRow key={keyHelper.getNextKeyValue()}>
                    {
                        serviceType?.tableColumns.map((tableColumn: any) => (
                            getDisplayCellValue(serviceDataRow, tableColumn)
                        ))
                    }
                    {
                        supplierInquiryHeaders.map((supplierInquiryHeader: any) => (
                            getDisplayCellValue(serviceDataRow, supplierInquiryHeader)
                        ))
                    }
                </TableRow>
            ): (
                serviceDataRow?.['supplier_inquiry_details']?.map((inquiryDetail: any, inqIndex: number) => (
                    <TableRow key={keyHelper.getNextKeyValue()}>
                        {
                            inqIndex == 0 ? (
                                serviceType?.tableColumns.map((tableColumn: any) => (
                                    getDisplayCellValue(serviceDataRow, tableColumn)
                                ))
                            ) : (
                                <TableCell colSpan={serviceType?.tableColumns.length}></TableCell>

                            )
                        }
                        {
                            <TableCell>
                                <Radio

                                    checked={selectedServiceSupplier?.[serviceDataRow?.['id']] == inquiryDetail?.['supplier_inquiry_detail_id']}
                                    onClick={() => handleSupplierSelect(serviceDataRow, inquiryDetail, serviceType.dataKey)}
                                    name="radio-buttons"
                                    inputProps={{'aria-label': 'A'}}
                                />
                            </TableCell>
                        }
                        {
                            supplierInquiryHeaders.map((supplierInquiryHeader: any) => (
                                getDisplayCellValue(inquiryDetail, supplierInquiryHeader)
                            ))
                        }
                    </TableRow>
                ))
            )
        ));
        return displayData;

    }


    const getHeaders = (serviceType: any) => {
        if (showSupplierInquiries) {
            return getHeadersWithSupplierInquiries(serviceType);
        } else {
            return getHeadersWithoutSupplierInquiries(serviceType);

        }
    }


    const getValues = (serviceType: any) => {
        if (showSupplierInquiries) {
            return getValuesWithSupplierInquiries(serviceType);


        } else {
            return getValuesWithoutSupplierInquiries(serviceType);
        }
    }
    return (
        <>
            {
                serviceTypes.map((serviceType: any) => (
                    serviceData?.[serviceType.dataKey]?.['data']?.length > 0  && (
                        <Card sx={{ mb: 3 }} variant='outlined' key={keyHelper.getNextKeyValue()}>
                            <CardHeader
                                title={serviceType?.cardTitle}
                                sx={{
                                    background: (theme) => theme.palette.grey[100],
                                    borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                                }}
                            />
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            {!showSupplierInquiries && !readOnly && <TableCell sx={{ width: '100px' }}></TableCell>}
                                            {getHeaders(serviceType)}

                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {getValues(serviceType)}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                    </Card>

                    )))
            }


            {
                serviceModalProps?.[serviceTypeKey] == embServiceType && <EditPackItemEMBService
                    colorwayId={colorwayId}
                    itemId={itemId}
                    countryId={countryId}
                    orderId={serviceModalProps?.orderId}
                    versionId={serviceModalProps?.versionId}
                    packItemId={serviceModalProps?.packItemId}
                    packItemEMBId={serviceModalProps?.packItemEMBId}
                    setModalOpen={setOpenServiceModal}
                    modalOpen={openServiceModal}
                    setUpdated={closeModalHandler}
                />
            }


            {
                serviceModalProps?.[serviceTypeKey] == washServiceType && <EditPackItemWashService
                    orderId={serviceModalProps?.orderId}
                    versionId={serviceModalProps?.versionId}
                    packItemId={serviceModalProps?.packItemId}
                    packItemWashId={serviceModalProps?.objectId}
                    setModalOpen={setOpenServiceModal}
                    modalOpen={openServiceModal}
                    setUpdated={closeModalHandler}
                    itemId={itemId}
                />
            }
            {
                serviceDeleteModalProps && <DeletePackItemService
                    orderId={serviceDeleteModalProps?.orderId}
                    versionId={serviceDeleteModalProps?.versionId}
                    packItemId={serviceDeleteModalProps?.packItemId}
                    serviceId={serviceDeleteModalProps?.objectId}
                    serviceType={serviceDeleteModalProps?.[serviceTypeKey]}
                    setModalOpen={setServiceDeleteModalProps}
                    modalOpen={openServiceDeleteModal}
                    setUpdated={closeModalHandler}
                />
            }

        </>
    )
}

export default DisplayCostingServiceData;