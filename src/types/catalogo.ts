export interface CatalogoBase {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface CentroNegocio extends CatalogoBase {
  codigo: string;
}

export interface TipoDocumento extends CatalogoBase {
  codigo: string;
  cuenta_contable: string;
}

export interface TipoRendicion extends CatalogoBase {
  cuenta_contable: string;
}

export interface TipoGasto extends CatalogoBase {
  cuenta_contable: string;
}

export interface GastoCatalogos {
  centrosNegocio: CentroNegocio[];
  tiposDocumento: TipoDocumento[];
  tiposGasto: TipoGasto[];
}
