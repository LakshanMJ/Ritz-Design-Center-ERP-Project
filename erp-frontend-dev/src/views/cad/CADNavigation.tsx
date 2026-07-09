import React, { useEffect, useState } from 'react';
import { useRouter } from "next/router";

import * as RestUrls from '@/helpers/constants/RestUrls';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import { cadNavigationDetailURL } from '@/helpers/constants/FrontEndUrls';
import { grey } from '@mui/material/colors';
import api from '@/services/api';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';

const CADNavigation = ({ orderId, versionId }: any) => {
    const router = useRouter();

    const [navigationData, setNavigationData] = useState<any[]>([]);

    const [selectedData, setSelectedData] = useState({
        order_country_id: null,
        order_item_id: null,
        colorway_type_id: null,
        colorway_id: null,
        order_group_id: null
    });

    const [selectedSubheader, setSelectedSubheader] = useState(null);

    useEffect(() => {
        if (orderId && versionId) {
            const navigationDataURL = RestUrls.getCadNavigationData(orderId as any, versionId as any);
            api.get(navigationDataURL).then(resp => {
                const reseditdata = resp?.data || {};
                setNavigationData({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            });
        }
    }, [orderId, versionId]);

    const handleListSubheaderClick = (
        order_country_id: number,
        order_item_id: number,
        colorway_type_id: number,
        colorway_id: number,
        order_group_id: number
    ) => {
        setSelectedData({
            order_country_id,
            order_item_id,
            colorway_type_id,
            colorway_id,
            order_group_id
        });

        setSelectedSubheader({
            order_country_id,
            order_item_id,
            colorway_type_id,
            colorway_id,
            order_group_id
        });

        router.push(
            cadNavigationDetailURL(
                versionId,
                orderId,
                order_country_id,
                colorway_id,
                order_item_id,
                order_group_id,
            )
        );
    };

    let groupedItems: any[] = [];

    navigationData?.['item_colorway_types']?.forEach((item: any) => {
        item.colorway_types.forEach((colorwayType: any) => {
            colorwayType.colorways.forEach((colorway: any) => {
                navigationData?.['order_countries']?.forEach((country: any) => {

                    navigationData?.['order_groups'].forEach((size_group: any) => {
                            groupedItems.push({
                                item,
                                colorwayType,
                                colorway,
                                country,
                                size_group
                            });
                    });
                });
            });
        });
    });

    const sortedKeys = Object.keys(groupedItems).sort();

    return (
        <>
            {/* <div>
                <span>
                    Selected Country ID: {selectedData.order_country_id}
                    <br />
                    Selected Colorway ID: {selectedData.colorway_id}
                    <br />
                    Selected Size Group ID: {selectedData.order_group_id}
                    <br />
                    Selected Item ID: {selectedData.order_item_id}
                </span>
            </div> */}
            <List disablePadding={true}>
                {groupedItems.map((item, index) => {
                    return (
                        <React.Fragment key={item.colorway.colorway_id}>
                                <ListSubheader
                                    disableSticky={true}
                                    sx={{
                                        borderBottom: "1px solid #cccccc",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        cursor: "pointer",
                                        lineHeight: "inherit",
                                        backgroundColor:
                                            selectedSubheader?.order_country_id === item.country.order_country_id &&
                                                selectedSubheader?.order_item_id === item.order_item_id &&
                                                selectedSubheader?.colorway_id === item.colorway.colorway_id &&
                                                selectedSubheader?.colorway_type_id === item.colorwayType.colorway_type_id &&
                                                selectedSubheader?.order_group_id === item.group.order_group_id
                                                ? grey[200]
                                                : "initial"
                                    }}
                                    onClick={() =>
                                        handleListSubheaderClick(
                                            item.country.order_country_id,
                                            item.item.order_item_id,
                                            item.colorwayType.colorway_type_id,
                                            item.colorway.colorway_id,
                                            item.size_group.order_group_id
                                        )
                                    }
                                >
                                    <span
                                        style={{
                                            marginLeft: "5px",
                                            marginBottom: "15px",
                                            marginTop: "15px",
                                        }}
                                    >
                                        {item.country.country_name} - {item.item.item_name} - {item.colorway.colorway} - {item.colorwayType.colorway_type} - {item.size_group.order_sizes.map((size: any) => size.size_name).join(", ")}
                                    </span>
                                </ListSubheader>
                        </React.Fragment>
                    )
                })}
            </List>
        </>
    );
};

export default CADNavigation;
