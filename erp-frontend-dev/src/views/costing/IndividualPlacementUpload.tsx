import React, { useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import RitzUploader from "@/components/Ritz/RitzUploader";
import { Card, useTheme } from "@mui/material";
import { buildFormData } from "@/helpers/Utilities";
import * as RestUrls from '../../helpers/constants/RestUrls';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const IndividualUpload = ({ orderId, versionId, orderInquiry, activeStatus }: any) => {
    const patternType="individual"
    const [orderItemPlacement, setOrderItemPlacement] = useState<any>({})
    const [isLoading, setIsLoading] = useState(true);
    const theme = useTheme()

    const fetchData = () => {
        setIsLoading(true);
        Promise.all([
            api.get(RestUrls.orderInquiryIndividualItemAttribute(orderId, versionId)),
        ]).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [placement] = respData;
            setOrderItemPlacement(placement);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const handleImage = (placementDetails: any, images: any) => {
        const details = placementDetails;
        const arr = details.split("_");
        const data = {
            order_item_id: arr[0],
            order_colorway_id: arr[1],
            item_attribute_id: arr[2],
            order_size_id: arr[3],
            order_country_id: arr[4],
            item_attribute_other: arr[5],
            image: images[0]?.file,
            orderID: orderId,
            pattern_type: patternType
        }
        const upload_data = buildFormData(data)

        if (images[0]?.file != null) {
            api.post(RestUrls.postUploadPlacementURL(orderId as any, versionId as any), upload_data).then(resp => {
                console.log(resp)
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
        }
    };
    const handleDelteImage = (patternId: any) => {
        api.put(RestUrls.deletePatternImageURL(patternId),{ pattern_type: patternType })
        .then(resp => {
          const responseData = resp?.data || [];
        })
        .catch(error => {
          toast.error(getDefaultError(error?.response?.status));
          // TODO ERROR
        });
    };
    const [selectedRow, setSelectedRow] = useState(null);

    const getColorwayRows = (country: any) => (
        Object.values(country.colorways).map((colorway: any, colorwayindex: any) => (
            <React.Fragment key={colorway.colorway_id + '_colorway_parent_' + country.country_id}>
                <TableRow key={colorway.colorway_id + '_colorway_inputs_' + country.country_id} hover selected={selectedRow === `${colorway.colorway_id}_colorway_inputs_${country.country_id}`}>
                    {colorwayindex == 0 ? <TableCell sx={{ fontWeight: 'bold', pl: 2 }}>{country.country_name}</TableCell> : <TableCell></TableCell>}
                    <TableCell sx={{ fontWeight: 'bold' }}>{colorway.colorway_name}</TableCell>
                    {
                        orderInquiry?.sizes?.map((size: any, index: number) => (
                            <TableCell key={index} align='center' sx={{ fontWeight: 'bold' }}></TableCell>
                        ))
                    }
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                </TableRow>
                {Object.values(colorway.items).map((item: any, itemIndex: number) => (
                    <React.Fragment key={colorway.colorway_id + "_" + "_" + item?.item_id + "_itemparent_" + country.country_id}>
                        <TableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>{item?.item_name} [ {item?.item_identifier} ]</TableCell>
                            {
                                orderInquiry?.sizes?.map((size: any, index: number) => (
                                    <TableCell key={index} align='center' sx={{ fontWeight: 'bold' }}></TableCell>
                                ))
                            }
                            <TableCell></TableCell>
                        </TableRow>
                        {/* adding placements */}
                        {
                            Object.values(item.placements).map((placement: any, index: number) => (
                                <TableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }} key={`${item.item_id}_${colorway.colorway_id}_${placement.placement_id}`}>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>{placement.placement_name}
                                    </TableCell>
                                    {
                                        orderInquiry?.sizes?.map((size: any, index: number) => {
                                            const sizeObjsWithPatternUrl = Object.values(placement.sizes);
                                            if (sizeObjsWithPatternUrl.some((sizeObj: any) => sizeObj.size === size.id)) {
                                                const matchingSizeObj = sizeObjsWithPatternUrl.find((sizeObj: any) => sizeObj.size === size.id) as { attachment: {pattern_url: string, pattern_id: number} };
                                                return (
                                                    <TableCell align='center' key={size.id}>
                                                        <RitzUploader
                                                            imagePath={matchingSizeObj?.attachment?.pattern_url}
                                                            multiple={false}
                                                            width={200}
                                                            height={200}
                                                            onChangeParent={(images: any) =>
                                                                handleImage(`${item.item_id}_${colorway.colorway_id}_${placement.placement_id}_${size.id}_${country.country_id}_${null}`, images)}
                                                            onDeleteParent={(index: any) => handleDelteImage(matchingSizeObj?.attachment?.pattern_id)}
                                                            disabled={activeStatus}
                                                        />
                                                    </TableCell>
                                                );
                                            } else {
                                                return <TableCell key={index}></TableCell>;
                                            }
                                        
                                        })
                                    }
                                    <TableCell></TableCell>
                                </TableRow>
                            ))
                        }
                        {/* adding other placements */}
                        {
                            Object.values(item.other_placements).map((otherPlacement: any, indexOther: number) => (
                                <TableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }} key={`${item.item_id}_${colorway.colorway_id}_${otherPlacement.placement_id}`}>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>{otherPlacement.placement_name}
                                    </TableCell>
                                    {
                                       orderInquiry?.sizes?.map((size: any, index: number) => {
                                        const sizeObjsWithPatternUrl = Object.values(otherPlacement.sizes);
                                    
                                        if (sizeObjsWithPatternUrl.some((sizeObj: any) => sizeObj.size === size.id)) {
                                            const matchingSizeObj = sizeObjsWithPatternUrl.find((sizeObj: any) => sizeObj.size === size.id) as { attachment: {pattern_url: string, pattern_id: number } };
                                            return (
                                                <TableCell align='center' key={index}>
                                                    <RitzUploader
                                                        imagePath={matchingSizeObj?.attachment?.pattern_url}
                                                        multiple={false}
                                                        width={200}
                                                        onChangeParent={(images: any) =>handleImage(`${item.item_id}_${colorway.colorway_id}_${null}_${size.id}_${country.country_id}_${otherPlacement.placement_id}`, images)}
                                                        onDeleteParent={(index: any) => handleDelteImage(matchingSizeObj?.attachment?.pattern_id)}
                                                        disabled={activeStatus}
                                                         />
                                                </TableCell>
                                            );
                                        } else {
                                            return <TableCell key={index}></TableCell>;
                                        }
                                    })
                                    }
                                    <TableCell></TableCell>
                                </TableRow>
                            ))
                        }
                    </React.Fragment>
                ))}
            </React.Fragment>
        )
        )
    )

    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId]);

    return (
        <>{isLoading ? <DefaultLoader /> :
            <Card id="customer-holder">
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ background: theme.palette.grey[200] }}>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                {
                                    orderInquiry?.sizes?.map((size: any, index: number) => (
                                        <TableCell key={index} align='center' sx={{ fontWeight: 'bold' }}>{size.name}</TableCell>
                                    ))
                                }
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{
                            [`& .${tableCellClasses.root}`]: {
                                py: '0.5rem',
                            }
                        }}>
                            {Object.values(orderItemPlacement).map((country: any, index: number) => {
                                return getColorwayRows(country);
                            })}
                        </TableBody>

                    </Table>
                </TableContainer>
            </Card>
        }</>
    )
}

export default IndividualUpload;

