import { NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export const revalidate = 0; // 캐시를 사용하지 않도록 설정

export async function GET(request: Request) {
  try {
    const rpcUrl = process.env.QUICKNODE_RPC_URL;
    const url = new URL(request.url);
    const addrParam = url.searchParams.get('addr') || undefined;
    const walletAddress = addrParam || process.env.BOT_WALLET_ADDRESS;

    if (!rpcUrl || !walletAddress) {
      // 서버 로그에만 오류를 기록하고 클라이언트에게는 일반적인 메시지를 보냅니다.
      console.error('환경 변수가 설정되지 않았습니다.');
      throw new Error('서버 설정에 오류가 있습니다.');
    }

    // QuickNode에 연결합니다.
    const connection = new Connection(rpcUrl, 'confirmed');
    const publicKey = new PublicKey(walletAddress);

    // 잔고를 Lamports 단위로 조회합니다.
    const lamports = await connection.getBalance(publicKey);

    // Lamports를 SOL로 변환합니다.
    const sol = lamports / LAMPORTS_PER_SOL;
    
    // 성공적으로 조회된 잔고를 JSON 형태로 반환합니다.
    return NextResponse.json({ sol, address: publicKey.toBase58() });

  } catch (error: any) {
    console.error('API 라우트 에러:', error.message);
    // 클라이언트에게는 상세 정보 없이 일반적인 에러 메시지를 보냅니다.
    return NextResponse.json(
      { error: '잔고를 가져오는 데 실패했습니다.' },
      { status: 500 }
    );
  }
}
