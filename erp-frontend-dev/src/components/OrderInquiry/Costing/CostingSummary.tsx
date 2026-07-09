import { Box, Button, Grid, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, darken } from "@mui/material";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import api from "@/services/api";
import * as RestUrls from '@/helpers/constants/RestUrls';
import { getDefaultError } from "@/helpers/Utilities";
import toast from "react-hot-toast";
import RitzModal from "@/components/Ritz/RitzModal";
import SaveSpinner from "@/components/SaveSpinner";
import RitzSingleFileUploader from "@/components/Ritz/RitzSingleFileUploader";
import NextLink from 'next/link';
import RitzMultipleFileUploader from "@/components/Ritz/RitzMultipleFileUploader";
import { LISTVIEW } from "@/helpers/constants/FileUpload";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import { costingOrderColorwayItemTypeImageUploadURL, costingOrderItemImageUploadURL } from "@/helpers/constants/rest_urls/CostingUrls";

const arrayHasValue = (arr: any[], field: string): boolean => {
    // check that at least 1 item in the array has a value in the field
    return arr.map(item => item[field]).some(val => val !== undefined && val !== null && val !== '');
}

const   CostingSummary = (props: any) => {
    const costingMetaData = useSelector((state: any) => state.CostingReducer?.order_inquiry);
    const techPackUploadLocation = `costing/techPack/${costingMetaData?.id}`;
    const orderItemFileUploadLocation = `costing/orderItems/${costingMetaData?.id}`;
    const orderItemColorwayFileUploadLocation = `costing/orderItemColorway/${costingMetaData?.id}`;
    const step = props?.step;
    const formValues = props?.formValues || {};
    const isSummaryPage = props?.isSummaryPage;
    const hasVersion = props?.hasVersion || false;
    const techPackAttachmentDetails =  props?.versionData?.attachments
    const versionId = props?.versionData?.id


    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isTechPackFileDeleting, setIsTechPackFileDeleting] = useState(false);
    const [selectedFileId, SetselectedFileId] = useState(0);

    const costing = props?.costing || useSelector((state: any) => state.CostingReducer);
    let order = costing?.order_inquiry;
    const meta = costing?.metadata;

    const labelStyle = {
        fontWeight: isSummaryPage ? 'bold' : 'inherit',
        color: (theme: any) => isSummaryPage ? theme.palette.grey[700] : 'inherit'
    }
    
    // console.log('%cCOSTING SUMMARY','color:orange;font-weight:bold;font-size:larger')
    // console.log('meta=', meta)
    // console.log('costing=', costing)
    // console.log('order=',order)
    // console.log('formVals=', formValues)

    if (formValues) {
        order = {
            ...order,
            ...formValues,
        }
        // console.log(order)

        // Sort countries
        let countries: Array<any> = [];
        order.countries?.forEach((c: any) => {
            const idProp = c?.country ? 'country' : 'id';
            const filtered = meta?.countries?.filter((m: any) => m.id == c[idProp])?.[0];
            countries.push({
                ...c,
                name: filtered?.name
            });
        });
        order.countries = countries.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const handleDownload = (filePath: string, fileName: string) => {
        const link = document.createElement('a');
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.href = filePath;
        link.download = fileName;
        link.click();
    };

    const handleTechPackFileDelete = () => {
        setIsTechPackFileDeleting(true)
        api.post(RestUrls.techPackFileDeleteURL(versionId, selectedFileId)).then(resp => {
            const respData = resp?.data || [];
            if(respData.message === 'File delete successful') {
                setIsDeleteModalOpen(false)
                const refreshSummaryData = true
                props.refreshSummaryData(refreshSummaryData)
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        })
        .finally(()=>{
            setIsTechPackFileDeleting(false)
        })
    }

    const handleDeleteModelOpen = (selectedFileId: any) => {
        setIsDeleteModalOpen(true), 
        SetselectedFileId(selectedFileId)
    }

    const onDeleteModalClose = () => {
        setIsDeleteModalOpen(false)
    }
    
    const handleFileChange = (attachment: any) => {
        const attachmentIds = attachment?.map((item: any) => item.id) || [];
        api.post(RestUrls.orderTechPackUploadURL(costingMetaData?.id), { attachment_ids: attachmentIds  || [] }).then(resp => {
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally();
    };

    const handleItemImageFileUpload = (attachment: any, itemData: any) => {
        const attachmentId = attachment.length > 0 ? attachment[0]?.id : null;
        api.post(costingOrderItemImageUploadURL(itemData?.id), { attachment_id: attachmentId  || null }).then(resp => {
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally();
    };

    const handleOrderItemColorwayImageFileUpload = (attachment: any, colorwayItemTypeId: any) => {
        const attachmentId = attachment.length > 0 ? attachment[0]?.id : null;
        api.post(costingOrderColorwayItemTypeImageUploadURL(colorwayItemTypeId), { attachment_id: attachmentId  || null }).then(resp => {
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally();
    };

    return (
        <>
        <Box
            sx={{
                fontSize: isSummaryPage ? 'inherit' : '0.8rem',
                lineHeight: isSummaryPage ? '2.2rem' : '1.3rem',
                mb: 0,
                pb: 0,
                wordWrap: 'break-word'
            }}
        >
            {/* General information & attachments */}
            {step === 0 && <Grid container columnSpacing={2}>
                
                <Grid item xs={5} sx={labelStyle}>Customer</Grid>
                <Grid item xs={7}>{order.customer ? meta?.customers?.filter((i: any) => i.id == order.customer)?.[0]?.name : '--'}</Grid>

                <Grid item xs={5} sx={labelStyle}>Brand</Grid>
                <Grid item xs={7}>{order.brand ? meta?.brands?.filter((i: any) => i.id == order.brand)?.[0]?.name : '--'}</Grid>

                <Grid item xs={5} sx={labelStyle}>Season</Grid>
                <Grid item xs={7}>{order.season ? meta?.seasons?.filter((i: any) => i.id == order.season)?.[0]?.name : '--'}</Grid>

                <Grid item xs={5} sx={labelStyle}>Department</Grid>
                <Grid item xs={7}>{order.department ? meta?.departments?.filter((i: any) => i.id == order.department)?.[0]?.department : '--'}</Grid>

                <Grid item xs={5} sx={labelStyle}>Year</Grid>
                <Grid item xs={7}>{order.year ? meta?.year_list?.filter((i: any) => i.id == order.year)?.[0]?.name : '--'}</Grid>

                <Grid item xs={5} sx={labelStyle}>Style Number</Grid>
                <Grid item xs={7}>{order.style_number || '--'}</Grid>

                <Grid item xs={5} sx={labelStyle}>Description</Grid>
                <Grid item xs={7}>{order.style_description || '--'}</Grid>

                <Grid item xs={5} sx={labelStyle}>Costing Type</Grid>
                <Grid item xs={7}>{order.current_version_data?.get_costing_type_display || '--'}</Grid>
                {order.current_version_data?.costing_type == 'pre_costing' && (
                    <>
                        <Grid item xs={5} sx={labelStyle}>Marketing Costing</Grid>
                        <Grid item xs={7}>
                            <Link target="_blank" component={NextLink} href={`/costing/add/${order.current_version_data?.marketing_costing_order_id}/version/${order.current_version_data?.marketing_costing_id}`}>{order.current_version_data?.marketing_costing_display_number || '--'}</Link>
                        </Grid>
                     </>
                )}

                {techPackAttachmentDetails?.length > 0 && (
                    <>
                    <Grid item xs={5} sx={labelStyle}>
                    Attachments
                    </Grid>
                    <Grid item xs={7}>
                    {techPackAttachmentDetails.map((techPack: any, index: any) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                            <Tooltip title="Delete" arrow>
                                <DeleteOutlineIcon 
                                    color="error" 
                                    sx={{ verticalAlign: 'middle', fontSize: '20px' }}
                                    onClick={()=> handleDeleteModelOpen(techPack.id)}
                                 />
                            </Tooltip>
                            <Tooltip title="Download" arrow>
                                <FileDownloadIcon
                                    color="primary"
                                    sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                                    onClick={() => handleDownload(techPack.file_path, techPack.display_name)}
                                />
                            </Tooltip>
                            <Typography sx={{ marginLeft: '0.5rem' }}>
                                {techPack.display_name}
                            </Typography>
                        </Box>
                    ))}
                    </Grid>   
                    </>
                )}
                {props?.isSummaryPage && (
                    <>
                        <Grid item xs={5} sx={labelStyle}>Tech Pack</Grid>
                        <Grid item xs={7}>
                            <RitzMultipleFileUploader
                                displayType={LISTVIEW}
                                selectedFilesParent={costingMetaData?.tech_packs || []}
                                handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles)}
                                filelocation={techPackUploadLocation} />
                            </Grid>
                    </>
                )}
                
            </Grid>}

            {/* Countries */}
            {step === 1 && order?.id && <Grid container columnSpacing={2}>
                {isSummaryPage && <Grid item xs={5} sx={labelStyle}>Countries</Grid>}
                {order.countries?.map((c: any, i: number) => <Grid item key={i}>{c.name}{i < order.countries.length - 1 && ','}</Grid>)}
            </Grid>}

            {/* Size information */}
            {step === 2 && order?.id && <Grid container columnSpacing={2}>
                <Grid item xs={5} sx={labelStyle}>Size Category</Grid>
                <Grid item xs={7}>{order.size_category ? meta?.sizes?.filter((i: any) => i.id == order.size_category)?.[0]?.name : '--'}</Grid>

                <Grid item xs={5} sx={labelStyle}>Sizes</Grid>
                <Grid item xs={7}>
                    {order.sizes?.length > 0 ? (<Grid container columnSpacing={2}>
                        {order.sizes.sort((a: any, b: any) => a?.sorting_order - b?.sorting_order).map((size: any, i: number) => <Grid item key={i}>{size.name}{i < order.sizes.length - 1 && ','}</Grid>)}
                    </Grid>) : '--'}
                </Grid>

                <Grid item xs={5} sx={labelStyle}>Costing Method</Grid>
                <Grid item xs={7}>{order.costing_method ? meta?.costing_methods?.filter((i: any) => i.id == order.costing_method)?.[0]?.name : '--'}</Grid>

                {order.costing_method == 'group_by_sizes' && (<>
                    <Grid item xs={5} sx={labelStyle}>Group Sizes</Grid>
                    <Grid item xs={7}>
                        {order.size_groups?.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: order.costing_method == 'group_by_sizes' ? '1rem' : 0, listStyleType: order.costing_method == 'group_by_sizes' ? 'disc' : 'none' }}>
                                {order.size_groups.map((grp: any, i: number) => 
                                    <li key={i}>
                                        {grp?.order_sizes_details?.length > 0 ? grp?.order_sizes_details?.map((size: any, i: number) =>
                                            <span key={`s-${i}`} style={{ marginRight: '1rem' }}>
                                                {size?.name}{i < grp?.order_sizes_details?.length - 1 && ','}
                                            </span>
                                        ) : <span>--</span>}
                                    </li>
                                )}
                            </ul>
                        ) : '--'}
                    </Grid>
                </>)}
            </Grid>}

            {/* Items */}
            {step === 3 && order?.id && <Grid container columnSpacing={2}>
                <Grid item xs={5} sx={labelStyle}>Pack Type</Grid>
                <Grid item xs={7}>{order.pack_type ? meta?.pack_types?.filter((i: any) => i.id == order.pack_type)?.[0]?.name : '--'}</Grid>

                <Grid item xs={5} sx={labelStyle}>Items</Grid>
                <Grid item xs={7}>
                    {order?.items?.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: order.pack_type === 'multi' ? '1rem' : 0, listStyleType: order.pack_type === 'multi' ? 'disc' : 'none' }}>
                            {order?.items?.map((item: any, i: number) => 
                            <li key={i}>
                                {item?.name}
                                {props?.isSummaryPage && (
                                    <RitzSingleFileUploader
                                        displayType={LISTVIEW}
                                        selectedFilesParent={item?.attachment ? [item?.attachment] : []}
                                        handleFileChangeParent={(selectedFiles: any) => handleItemImageFileUpload(selectedFiles, item)}
                                        filelocation={orderItemFileUploadLocation}
                                    />)}
                            </li>)}
                        </ul>
                    ) : '--' }
                </Grid>
            </Grid>}

            {/* Colorway categories */}
            {/* {step === 4 && order?.id && <>
                {order?.colorway_categories?.length > 0 && (
                    <>
                        {order.colorway_categories.map((c: any, i: number) => 
                        <Grid container key={i} columnSpacing={2}>
                            <Grid item xs={5} sx={labelStyle}>{c.name}</Grid>
                            <Grid item xs={7}>
                                {c.types?.length > 0 && arrayHasValue(c?.types, 'name') ? (
                                    <>
                                        {c.types?.filter((item: any) => item?.name).map((item: any, i: number) => (
                                            <span key={`${i}-${item?.name}`} style={{ marginRight: '1rem' }}>{item?.name}{i < c.types?.filter((item: any) => item?.name).length - 1 && ','}</span>
                                        ))}
                                    </>
                                ) : '--'}
                            </Grid>
                        </Grid>)}
                    </>
                )}
            </>} */}

            {/* Order colorways */}
            {step === 4 && order?.id && <Grid container columnSpacing={2}>
                {isSummaryPage && <Grid item xs={5} sx={labelStyle}>Colorways</Grid>}
                {(order.colorways?.length > 0 && arrayHasValue(order.colorways, 'colorway')) && <Grid item>
                    <Grid container columnSpacing={2}>
                        {order.colorways.map((item: any, i: number) => 
                            <Grid item key={`${i}-${item.colorway}`}>{item.colorway}{i < order.colorways?.filter((item: any) => item?.colorway).length - 1 && ','}</Grid>
                        )}
                    </Grid>
                </Grid>}
            </Grid>}

            {/* Colorway matrix */}
            {step === 5 && order?.id && isSummaryPage && <Grid container columnSpacing={2}>
                {(hasVersion || isSummaryPage) && <Grid item xs={5} sx={labelStyle}>Colorway Matrix</Grid>}
                <Grid item xs={12} sx={{ mt: (hasVersion || isSummaryPage) ? 1 : 0 }}>
                    <TableContainer>
                        <Table
                            sx={{
                                border: (theme) => (hasVersion || isSummaryPage) ? `1px solid ${theme.palette.divider}` : 'none',
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell/>
                                    {order.colorways?.map((colorway: any, index: any) => (
                                        <TableCell key={index} align='center' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{colorway.colorway}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {order.items?.map((item: any, index: number) => (
                                    <TableRow 
                                        key={item.id} 
                                        sx={{
                                            '&:nth-of-type(odd)': {
                                                backgroundColor: (theme) => theme.palette.grey[50],
                                            },
                                            '&:last-child td, &:last-child th': {
                                                borderBottom: 0
                                            }
                                        }}
                                    >
                                        <TableCell>{item.name}</TableCell>
                                        {order.colorways?.map((colorway: any) => {
                                            const colorwayItemType = order?.colorway_item_types?.find(
                                                (itemCWType: any) => itemCWType?.item === item?.id && itemCWType?.colorway === colorway.id
                                            );
                                            return (
                                                <TableCell
                                                    key={`${colorway.id}_${item.id}`}
                                                    align="center"
                                                    sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                >
                                                    {colorwayItemType?.colorway_category_display}
                                                    <Box sx={{width: '100%',  display: 'flex',justifyContent: 'center', alignItems: 'center' }} >
                                                        <RitzSingleFileUploader
                                                            displayType={LISTVIEW}
                                                            selectedFilesParent={colorwayItemType?.attachment ? [colorwayItemType?.attachment] : []}
                                                            handleFileChangeParent={(selectedFiles: any) =>
                                                                handleOrderItemColorwayImageFileUpload(selectedFiles, colorwayItemType?.id)
                                                            }
                                                            filelocation={orderItemColorwayFileUploadLocation}
                                                        />
                                                    </Box>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>}  
        </Box>
        {isDeleteModalOpen && <RitzModal
            open={isDeleteModalOpen}
            onClose={onDeleteModalClose}
            maxWidth='xs'
            title='Confirm Delete'
        >
        <>
        <Box>
            <Typography>Are you sure you want to delete this file?</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
                <Button variant='contained' onClick={handleTechPackFileDelete} color='error' disabled={isTechPackFileDeleting}>
                    {isTechPackFileDeleting && <SaveSpinner/>}Delete
                </Button>
            </Box>
        </Box>
        </>
        </RitzModal>}
        </>
    )
};

export default CostingSummary;