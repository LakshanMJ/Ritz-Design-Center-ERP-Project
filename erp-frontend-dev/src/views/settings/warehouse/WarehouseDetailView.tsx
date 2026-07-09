import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { Grid, Divider, Link, Breadcrumbs } from "@mui/material";
import { TabContext } from "@mui/lab";
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import DefaultLoader from "@/components/DefaultLoader";
import WarehouseRackBins from "./WarehouseRackBins";
import WarehouseRacks from "./WarehouseRacks";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NextLink from 'next/link';
import api from "@/services/api";
import { warehouseDetailsURL, warehouseRackListURL } from "@/helpers/constants/rest_urls/VirtualWarehouseUrls";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import Meterial from "./Meterial";

const WarehouseDetailView = ({ warehouseId }: any) => {
  const router = useRouter();
  const [item, setItem] = useState<any>({});
  const [activeTab, setActiveTab] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [racks, setRacks] = useState<any[]>([]);

  const fetchWarehouseData = () => {
    setIsDataLoading(true);
    Promise.all([
      api.get(warehouseDetailsURL(warehouseId)),
      api.get(warehouseRackListURL(warehouseId)),
    ])
      .then(([warehouseResponse, racksResponse]) => {
        setItem(warehouseResponse.data || {});
        setRacks(racksResponse.data || []);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status) || "Failed to fetch data");
      })
      .finally(() => setIsDataLoading(false));
  };

  const handleChangeTabs = (event: string) => {
    setIsLoading(true);
    const url = {
      pathname: router.pathname,
      query: { ...router.query, tab: event },
    };
    router.replace(url, undefined, { shallow: true }).then(() => {
      setIsLoading(false);
    });
    setActiveTab(event);
  };

  useEffect(() => {
    if (warehouseId) {
      fetchWarehouseData();
    }
  }, [warehouseId]);

  useEffect(() => {
    const { tab } = router.query;
    if (tab) {
      setActiveTab(tab.toString());
    }
  }, [router.query]);

  return (
    <>
      {isDataLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
            sx={{ mb: 1.5 }}
          >
            <Link underline="hover" color="inherit" component={NextLink} href={'/admin/warehouse'}>
              Warehouse List
            </Link>
            <Typography color="text.primary">Warehouse Details</Typography>
          </Breadcrumbs>
          <Typography variant="h1">{item?.warehouse_name || '--'}</Typography>

          <Card variant='outlined' sx={{ mb: 2 }}>
            <Grid container columnSpacing={2} px={2}>
              <Grid item sm={2} xs={2}>
                <dl>
                  <dt>Name</dt>
                  <dd>{item?.warehouse_name || '--'}</dd>
                </dl>
              </Grid>
              <Divider orientation='vertical' variant='middle' flexItem />
              <Grid item sm={2} xs={2}>
                <dl>
                  <dt>Plant</dt>
                  <dd>{item?.plant_name || '--'}</dd>
                </dl>
              </Grid>
              <Divider orientation='vertical' variant='middle' flexItem />
              <Grid item sm={4} xs={4}>
                <dl>
                  <dt>Warehouse Manager</dt>
                  <dd>{item?.role_full_name || '--'}</dd>
                </dl>
              </Grid>
            </Grid>
          </Card>

          <Box sx={{ width: '100%', typography: 'body1' }}>
            <TabContext value={activeTab}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <RitzTabs
                  tabs={['Warehouse Racks', 'Warehouse Rack Bins', 'Inhouse Material']}
                  activeTab={activeTab}
                  emitChange={handleChangeTabs}
                />
              </Box>
              <RitzTabPanel value="1" sx={{ pt: 2 }}>
                {isLoading && activeTab === '1' ? (
                  <DefaultLoader />
                ) : (
                  <WarehouseRacks warehouseId={warehouseId} racks={racks} refreshRacks={fetchWarehouseData} />
                )}
              </RitzTabPanel>
              <RitzTabPanel value="2" sx={{ pt: 2 }}>
                {isLoading && activeTab === '2' ? (
                  <DefaultLoader />
                ) : (
                  <WarehouseRackBins warehouseId={warehouseId} racks={racks} />
                )}
              </RitzTabPanel>
              <RitzTabPanel value="3" sx={{ pt: 2 }}>
                {isLoading && activeTab === '3' ? (
                  <DefaultLoader />
                ) : (
                  <Meterial />
                )}
              </RitzTabPanel>
            </TabContext>
          </Box>
        </>
      )}
    </>
  );
};

export default WarehouseDetailView;