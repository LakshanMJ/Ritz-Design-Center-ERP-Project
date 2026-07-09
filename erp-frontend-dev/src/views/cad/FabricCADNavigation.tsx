import React, { useEffect, useState } from 'react';
import { useRouter } from "next/router";

import * as RestUrls from '@/helpers/constants/RestUrls';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import { cadNavigationDetailURL } from '@/helpers/constants/FrontEndUrls';
import api from "@/services/api";
import {getFabricNavigationURL} from "@/helpers/constants/RestUrls";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const FabricCADNavigation = ({ orderId }: any) => {
    const router = useRouter();

    const [navigationData, setNavigationData] = useState<any[]>([]);


    useEffect(() => {
        if (orderId) {
            const navigationDataURL = RestUrls.getFabricNavigationURL(orderId as any);
            api.get(navigationDataURL).then(resp => {
                const reseditdata = resp?.data || [];
                setNavigationData([ ...reseditdata ]);
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            });
        }
    }, [orderId]);

    const handleListSubheaderClick = (
        itemId: number,
        colorwayId: number,
        versionId: number
    ) => {

        // router.push(
            // cadNavigationDetailURL(
            //     orderId,
            //     colorway_id
            // )
        // );
    };

    let groupedItems: any[] = [];


    const sortedKeys = Object.keys(groupedItems).sort();

    return (
        <>
            <List disablePadding={true}>
                {navigationData.map((item, index) => {
                    return (
                        <React.Fragment key={index}>
                                <ListSubheader
                                    disableSticky={true}
                                    sx={{
                                        borderBottom: "1px solid #cccccc",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        cursor: "pointer",
                                        lineHeight: "inherit",

                                    }}
                                    onClick={() =>
                                        handleListSubheaderClick(
                                            orderId,
                                            item.item_id,
                                            1// TODO - version fix this
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
                                        {item.item_name} - {item.colorway_type}
                                    </span>
                                </ListSubheader>
                        </React.Fragment>
                    )
                })}
            </List>
        </>
    );
};

export default FabricCADNavigation;
