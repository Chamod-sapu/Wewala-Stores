import React from 'react';
import { STORE_CONFIG } from '@wewala/shared';
import { PrintOrderData } from './OrderInvoicePrint';

interface OrderPackingSlipPrintProps {
  orders: PrintOrderData[];
}

export const OrderPackingSlipPrint: React.FC<OrderPackingSlipPrintProps> = ({ orders }) => {
  if (!orders || orders.length === 0) return null;

  return (
    <div className="hidden print:block font-sans text-black bg-white">
      {orders.map((order, index) => (
        <div
          key={order.id}
          className={`p-8 max-w-4xl mx-auto bg-white ${
            index < orders.length - 1 ? 'break-after-page' : ''
          }`}
        >
          {/* Packing Slip Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-black">
                {STORE_CONFIG.name} - LOGISTICS
              </h1>
              <p className="text-xs text-slate-700">Maharagama Central Warehouse • Dispatch Terminal</p>
              <p className="text-xs text-slate-700">Dispatch Support: +94 11 285 4321</p>
            </div>

            <div className="text-right">
              <span className="inline-block border-2 border-black px-3 py-1 font-black text-sm uppercase tracking-wider">
                PACKING SLIP
              </span>
              <p className="font-mono text-sm font-black mt-2">
                ORD-{order.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Created: {new Date(order.created_at).toLocaleString()}
              </p>
              <p className="text-xs font-bold text-slate-800 uppercase mt-0.5">
                Payment: {order.payment_method === 'cod' ? 'CASH ON DELIVERY' : 'PREPAID CARD'}
              </p>
            </div>
          </div>

          {/* Shipping Address Label */}
          <div className="mb-6 rounded-lg border-2 border-black p-4 bg-slate-50">
            <h2 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-800">
              SHIP TO RECIPIENT:
            </h2>
            <div className="text-sm">
              <p className="font-black text-base">{order.shipping_address?.recipient_name || 'Customer'}</p>
              <p className="text-slate-800 font-medium">{order.shipping_address?.street_address}</p>
              <p className="text-slate-800 font-medium">
                {order.shipping_address?.city}
                {order.shipping_address?.postal_code ? ` - ${order.shipping_address.postal_code}` : ''}
              </p>
              <p className="text-slate-800 font-medium">{order.shipping_address?.country || 'Sri Lanka'}</p>
              {order.shipping_address?.phone && (
                <p className="text-sm font-black mt-2 text-black">
                  📞 CONTACT: {order.shipping_address.phone}
                </p>
              )}
            </div>
          </div>

          {/* Items Checklist Table */}
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider mb-2">
              PICK LIST ({order.order_items?.length || 0} ITEMS):
            </h3>
            <table className="w-full text-left border-collapse border border-black">
              <thead>
                <tr className="border-b-2 border-black bg-slate-100 text-xs font-black uppercase text-black">
                  <th className="py-2.5 px-3 border-r border-black w-12 text-center">CHECK</th>
                  <th className="py-2.5 px-3 border-r border-black">ITEM DESCRIPTION</th>
                  <th className="py-2.5 px-3 border-r border-black w-24 text-center">QTY TO PICK</th>
                  <th className="py-2.5 px-3 w-28 text-center">VERIFIED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-xs">
                {order.order_items?.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="py-3 px-3 border-r border-black text-center">
                      <div className="w-5 h-5 border-2 border-black mx-auto rounded-sm" />
                    </td>
                    <td className="py-3 px-3 border-r border-black">
                      <p className="font-bold text-sm text-black">{item.name_snapshot}</p>
                      <p className="font-mono text-[10px] text-slate-600">ID: {item.id || 'N/A'}</p>
                    </td>
                    <td className="py-3 px-3 border-r border-black text-center font-black text-base">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="w-5 h-5 border-2 border-dashed border-slate-400 mx-auto rounded-sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* COD Notice if applicable */}
          {order.payment_method === 'cod' && (
            <div className="mb-6 rounded-lg border-2 border-dashed border-black p-3 bg-amber-50">
              <p className="text-xs font-black text-amber-900 uppercase">
                ⚠️ CASH ON DELIVERY NOTICE: COLLECT EXACT AMOUNT FROM CUSTOMER:
              </p>
              <p className="text-xl font-black text-black mt-1">
                {STORE_CONFIG.currencySymbol} {Number(order.total).toLocaleString()}
              </p>
            </div>
          )}

          {/* Signoff Footer */}
          <div className="mt-8 border-t-2 border-black pt-4 grid grid-cols-3 gap-6 text-xs text-slate-800">
            <div>
              <p className="font-bold">Picked By:</p>
              <div className="mt-6 border-b border-black w-full" />
            </div>
            <div>
              <p className="font-bold">Packed & Inspected By:</p>
              <div className="mt-6 border-b border-black w-full" />
            </div>
            <div>
              <p className="font-bold">Courier Handover Sign:</p>
              <div className="mt-6 border-b border-black w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

