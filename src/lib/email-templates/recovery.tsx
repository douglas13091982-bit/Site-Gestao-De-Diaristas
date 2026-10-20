import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Redefina sua senha da {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Redefina sua senha</Heading>
        <Text style={text}>
          Recebemos um pedido para redefinir sua senha da {siteName}. Clique no botão abaixo para escolher uma nova senha.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Redefinir senha
        </Button>
        <Text style={footer}>
          Se você não pediu a redefinição, pode ignorar este e-mail. Sua senha não será alterada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Manrope, Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0a2f4a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#4b6475',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: "#10b981",
  color: '#ffffff',
  fontSize: '14px',
  border: "1px solid #10b981",
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #0a2f4a !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #0a2f4a !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #0a2f4a !important; }
`
