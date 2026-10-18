/** Reserva as áreas da arte e das informações enquanto a consulta do NFT está pendente. */
export function NFTDetailsSkeleton() {
  return <main className="mx-auto w-full max-w-[1200px] md:pb-20" role="status" aria-label="Carregando detalhes do NFT" aria-busy="true">
    <span className="sr-only">Carregando detalhes do NFT…</span>
    {/* O carregamento mobile acompanha a imagem quadrada e o painel sobreposto do layout final. */}
    <div aria-hidden="true" className="mx-auto max-w-[414px] px-7 pt-[67px] md:hidden">
      <div className="catalog-skeleton aspect-square w-full" />
      <div className="relative -mx-1 -mt-8 flex min-h-[380px] flex-col gap-5 rounded-t-[31px] bg-[#241612] p-6">
        <div className="catalog-skeleton h-5 w-2/3" />
        {[0, 1, 2].map(index => <div key={index} className="catalog-skeleton h-4 w-full" />)}
        <div className="catalog-skeleton h-8 w-4/5" />
        <div className="mt-auto flex gap-3"><div className="catalog-skeleton h-[60px] flex-1 rounded-full" /><div className="catalog-skeleton size-[60px] rounded-full" /></div>
      </div>
    </div>
    {/* Miniaturas e coluna de informações preservam as dimensões principais do detalhe desktop. */}
    <div aria-hidden="true" className="hidden px-6 md:block xl:px-0">
      <div className="catalog-skeleton mb-6 h-5 w-40" />
      <div className="grid min-h-[520px] grid-cols-[420px_minmax(0,1fr)] gap-8 max-[1023px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 gap-3"><div className="flex w-[72px] shrink-0 flex-col gap-3 max-[1023px]:hidden">{[0, 1, 2, 3].map(index => <div key={index} className="catalog-skeleton aspect-square rounded-[10px]" />)}</div><div className="catalog-skeleton min-h-[300px] flex-1 rounded-[10px]" /></div>
        <div className="flex min-w-0 flex-col gap-5"><div className="catalog-skeleton h-8 w-3/4" /><div className="catalog-skeleton h-6 w-24" />{[0, 1, 2, 3, 4].map(index => <div key={index} className="catalog-skeleton h-4 w-full" />)}<div className="catalog-skeleton mt-auto h-12 w-48 rounded-lg" /></div>
      </div>
    </div>
  </main>;
}
