import React, { useEffect, useState } from 'react';
import { Alert, Card, Grid, Typography } from '@mui/material';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import RitzStackedBarChart from '@/components/Charts/RitzStackedBarChart';

const GrnFabricSummary = ({ grnId }: any) => {

  const [summary, setSummary] = useState([]);
  const [formattedData, setFormattedData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

    const fetchData = () => {
        api.get(GrnUrls.grnFabricMaterialSummaryUrl(grnId))
            .then(resp => {
                const responseData = resp?.data || [];
                let data = [] as any;

                responseData.map((row: any) => {
                    let row_data = {labels: [] as any, datasets: [] as any}

                    let widths = [] as any;
                    let shadeGroups = [] as any;
                    let widthMappings = {} as any;
                    row?.['width_group']?.map((widthGroup: any) => {
                        const currentWidth = widthGroup?.['width'];
                        widths.push(currentWidth);

                        if (!widthMappings?.[currentWidth]) {
                            widthMappings[currentWidth] = {} as any;
                        }
                        widthGroup?.['width_shade_group']?.map((shadeGroup: any) => {
                            const shadeDisplay = shadeGroup['shade_display'];

                            if (!shadeGroups.includes(shadeDisplay)) {
                                shadeGroups.push(shadeDisplay)
                            }
                            widthMappings[currentWidth][shadeDisplay] = shadeGroup['total_quantity'];

                        });
                    });

                    row_data['labels'] = widths;

                    shadeGroups.map((shadeGroup: any) => {
                        const shadeGroupData = {
                            label: shadeGroup,
                            data: [] as any
                        }
                        row_data['labels'].map((width: any) => {
                            shadeGroupData['data'].push(widthMappings?.[width]?.[shadeGroup] || 0);
                        })
                        row_data['datasets'].push(shadeGroupData);
                    })
                    data.push(row_data);

                })
                setFormattedData([...data]);
                setSummary(responseData);
            })
            .catch(error => {
                console.log(error)
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() =>setIsLoading(false))
    };

  useEffect(() => {
    fetchData();
  }, []);


  return (
    <>
     {isLoading ? <></> : <>
    {summary.length === 0 && (
      <Alert severity="info">Fabric summary is not available at this moment</Alert>
    )}
    <Grid container spacing={1}>
       {formattedData.map((materialData, index) => (
        <Grid item xs={4} key={index}>
          <Card sx={{ mb: 3, height: '100%' }}>
            <Typography variant="h6" align="center" sx={{ mt: 3 }}>
              {summary[index]?.grn_material_details?.material_details?.material_label} -{' '}
              {summary[index]?.grn_material_details?.material_details?.ritz_customer_brand_reference_code} -{' '}
              {summary[index]?.grn_material_details?.material_details?.reference_code}
            </Typography>
            <RitzStackedBarChart labels={materialData.labels} datasets={materialData.datasets} xAxisName={'Width'} yAxisName={'Quantity'} />
          </Card>
        </Grid>
      ))}
    </Grid>
    </>}
    </>
  );
};

export default GrnFabricSummary;
