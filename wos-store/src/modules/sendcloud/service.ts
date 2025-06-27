import { MedusaService } from "@medusajs/utils"
import axios, { AxiosError } from "axios"

type ConstructorArgs = { /* you can inject other services here later */ }
type ModuleOptions = {
  sendcloudApiKey: string
  sendcloudApiSecret: string
}

interface Parcel {
  id: number
  tracking_number?: string
  [key: string]: any
}

interface Label {
  id: string
  tracking_url?: string
  [key: string]: any
}

interface TrackingInfo {
  parcel_id: string
  carrier_code: string
  tracking_number: string
  carrier_tracking_url: string
  statuses: TrackingStatus[]
  [key: string]: any
}

interface TrackingStatus {
  parent_status: string
  carrier_message: string
  carrier_update_timestamp: string
  [key: string]: any
}

class SendcloudService {
  protected readonly apiKey_: string
  protected readonly apiSecret_: string
  protected readonly baseUrl_: string

  constructor(_: ConstructorArgs, options: ModuleOptions) {
    if (!options.sendcloudApiKey || !options.sendcloudApiSecret) {
      throw new Error("SendCloud API credentials are required")
    }

    this.apiKey_ = process.env.NEXT_PUBLIC_SENDCLOUD_PUBLIC_KEY || options.sendcloudApiKey
    this.apiSecret_ = process.env.NEXT_PUBLIC_SENDCLOUD_PRIVATE_KEY || options.sendcloudApiSecret
    this.baseUrl_ = "https://panel.sendcloud.sc/api/v2"
  }

  private async makeRequest(config: {
    method: 'get' | 'post'
    url: string
    data?: any
  }) {
    try {
      const response = await axios({
        method: config.method,
        url: `${this.baseUrl_}${config.url}`,
        data: config.data,
        auth: {
          username: this.apiKey_,
          password: this.apiSecret_
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError
      console.error("SendCloud API Error:", {
        url: config.url,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message
      })
      const errorMessage =
        (axiosError.response?.data && typeof axiosError.response.data === 'object' && 'message' in axiosError.response.data
          ? (axiosError.response.data as { message?: string }).message
          : undefined) || axiosError.message
      throw new Error(
        `SendCloud API request failed: ${errorMessage}`
      )
    }
  }

 async createParcel(order: any): Promise<Parcel> {
  console.log("📦 Creating parcel for order:", order);
  
  // Validate and format country code
  const countryCode = order.shipping_address.country_code?.toUpperCase() || '';
  if (!countryCode || countryCode.length !== 2) {
    throw new Error(`Invalid country code: ${order.shipping_address.country_code}`);
  }

 const payload = {
  parcel: {
    name: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
    address: order.shipping_address.address_1,
    house_number: order.shipping_address.house_number || '', // 👈 Add this line
    postal_code: order.shipping_address.postal_code,
    city: order.shipping_address.city,
    country: countryCode,
    email: order.email,
    phone: order.shipping_address.phone || '',
    weight: order.shipping_address.weight || "1.0",
    order_number: order.id,
    company_name: order.shipping_address.company || '',
    address_2: order.shipping_address.address_2 || ''
  }
}


  console.log("📦 Creating parcel with payload:", payload)

  const data = await this.makeRequest({
    method: 'post',
    url: '/parcels',
    data: payload
  })

  console.log("✅ Parcel created:", data.parcel)
  return data.parcel
}

  async createLabel(parcelId: number): Promise<Label> {
    const payload = {
      label: {
        parcels: [parcelId]
      }
    }

    console.log("🏷️ Creating label with payload:", payload)

    const data = await this.makeRequest({
      method: 'post',
      url: '/labels',
      data: payload
    })

    console.log("✅ Label created:", data.label)
    return data.label
  }

  async createLabelForOrder(order: any): Promise<{ parcel: Parcel; label: Label }> {
    const parcel = await this.createParcel(order)
    const label = await this.createLabel(parcel.id)
    return { parcel, label }
  }

  async getTrackingInfo(trackingNumber: string): Promise<TrackingInfo> {
    if (!trackingNumber) {
      throw new Error("Tracking number is required")
    }

    const data = await this.makeRequest({
      method: 'get',
      url: `/tracking/${encodeURIComponent(trackingNumber)}`
    })

    return data
  }

  async getTrackingLink(labelId: string): Promise<string> {
    const data = await this.makeRequest({
      method: 'get',
      url: `/labels/${labelId}/tracking`
    })

    return data.tracking_url || ''
  }

  async getParcelStatuses(): Promise<any> {
    const data = await this.makeRequest({
      method: 'get',
      url: '/parcels/statuses'
    })

    return data
  }
}

export default SendcloudService