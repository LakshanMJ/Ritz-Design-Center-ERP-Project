import { useEffect, useState } from "react";
import { Link, Typography } from '@mui/material';
import * as RestUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import NextLink from 'next/link';
import DefaultLoader from "@/components/DefaultLoader";
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { createdMaterialDetailsListURL } from "@/helpers/constants/front_end/AdminUrls";

const CreatedMaterials = () => {

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'material',
      header: 'Material',
      cell: (props) => (
        <Link component={NextLink} href={createdMaterialDetailsListURL(props.row.original.id, 1)}>{props.row.getValue('material') ?? ''}</Link>
      )
    },
    {
      accessorKey: "name",
      header: 'Name',
    },
    {
      accessorKey: "category",
      header: 'Category',
      cell: (props) => (
        props.row.getValue('material')
      )
    },
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [materialData, setMaterialData] = useState<any>([]);

  const getData = () => {
    setIsLoading(true);
    api.get(RestUrls.getUserDefineMaterialsURL()).then(resp => {
      const resdata = resp?.data || [];
      setMaterialData([...resdata]);
    }).catch((error) => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <>
      <Typography variant='h1'>Created Material List</Typography>
      {isLoading && <DefaultLoader />}
      {!isLoading && (
        <>
          <RitzTable
            data={materialData}
            columns={columns}
          />
        </>
      )}
    </>
  );
}

export default CreatedMaterials