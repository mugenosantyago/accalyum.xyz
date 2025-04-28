"use client"

import { useState, useEffect } from "react"
import { AlephiumUtils } from "@/lib/alephium-utils"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface AddressValidatorProps {
  address: string
  showDetails?: boolean
  className?: string
}

export function AddressValidator({ address, showDetails = false, className = "" }: AddressValidatorProps) {
  const [validation, setValidation] = useState({
    isValid: false,
    isContract: false,
    isAsset: false,
  })
  const [group, setGroup] = useState<number>(-1)

  useEffect(() => {
    if (address) {
      const result = AlephiumUtils.validateAddress(address)
      setValidation(result)

      if (result.isValid) {
        const addressGroup = AlephiumUtils.getAddressGroup(address)
        setGroup(addressGroup)
      } else {
        setGroup(-1)
      }
    } else {
      setValidation({ isValid: false, isContract: false, isAsset: false })
      setGroup(-1)
    }
  }, [address])

  if (!address) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {validation.isValid ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}

      {validation.isValid ? (
        <span className="text-green-500">
          Valid {validation.isContract ? "contract" : "wallet"} address
          {group >= 0 && ` (Group ${group})`}
        </span>
      ) : (
        <span className="text-red-500">Invalid address</span>
      )}

      {showDetails && validation.isValid && validation.isContract && (
        <div className="flex items-center gap-1 ml-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-amber-500">Contract addresses cannot receive direct transfers</span>
        </div>
      )}
    </div>
  )
}
